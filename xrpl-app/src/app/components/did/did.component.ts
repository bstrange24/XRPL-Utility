import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { DIDDelete, DIDSet } from 'xrpl';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import didSchema from './did-schema.json';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { RequirementsInfoComponent } from './ui-components/requirements-info/requirements-info.component';
import { DidUtilService } from '../../services/did/did-util/did-util.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { DidTransactionOrchestratorService } from '../../services/did/did-transaction-orchestrator/did-transaction-orchestrator.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';

@Component({
     selector: 'app-did',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, JsonEditorComponent, RequirementsInfoComponent],
     templateUrl: './did.component.html',
     styleUrl: './did.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     @ViewChild('didDocumentEditor') didDocumentEditor!: JsonEditorComponent;
     @ViewChild('uriEditor') uriEditor!: JsonEditorComponent;
     @ViewChild('didDataEditor') didDataEditor!: JsonEditorComponent;

     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly acccountDataService = inject(AcccountDataService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly didTransactionOrchestratorService = inject(DidTransactionOrchestratorService);
     public readonly didUtilService = inject(DidUtilService);

     activeTab = signal<'set' | 'delete'>('set');
     currentWallet = signal<Wallet>({} as Wallet);
     credentialSearchTerm = signal<string>('');
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);

     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());
     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
          console.log('_hasWalletsEffect');
          if (this.walletManager.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Effect 2: Wallets list sync
     private readonly _walletsSyncEffect = effect(() => {
          console.log('_walletsSyncEffect');
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          console.log('_selectedIndexEffect');
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();

          // Fire-and-forget refresh
          void this.getDidForAccount(false);
     });

          readonly actionButtonLabel = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return this.didUtilService.setDidButtonLabel();
               case 'delete':
                    return this.didUtilService.deleteDidButtonLabel();
          }
     });

     readonly actionButtonClass = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return 'btn-primary-blue';
               case 'delete':
                    return 'btn-primary-red';
          }
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) {
               return null;
          }

          const walletName = wallet.name || 'Selected wallet';
          const dids = this.txUiService.existingDid();
          const didCount = dids.length;
          const mode = this.activeTab();

          return {
               walletName,
               mode,
               didCount,
               existingDid: dids,
          };
     });

     hasJsonSyntaxError = computed(() => {
          this.txUiService.didData(); // trigger recompute

          const error = this.didDataEditor?.jsonError()?.trim();
          return !!error;
     });

     getCreateButtonTooltip(): string {
          if (this.txUiService.spinner()) {
               return 'Setting DID on the XRPL';
          }
          if (!this.allFieldsValid()) {
               const issues: string[] = [];

               if (!this.didUtilService.didDocumentDataIsValid()) {
                    issues.push(`DID Document too large: ${this.didUtilService.didDocumentDataByteLength()} bytes (>256)`);
               }
               if (!this.didUtilService.uriDataIsValid()) {
                    issues.push(`URI too large: ${this.didUtilService.uriDataByteLength()} bytes (>256)`);
               }
               if (!this.didUtilService.didDataIsValid()) {
                    issues.push(`DID Data too large: ${this.didUtilService.didDataByteLength()} bytes (>256)`);
               }
               if (this.hasJsonSyntaxError()) {
                    const errorMsg = this.didDataEditor?.jsonError()?.trim() || 'Syntax error';
                    issues.push(`Invalid JSON in DID Data: ${errorMsg}`);
               }

               return 'Cannot submit:\n• ' + issues.join('\n• ');
          }
          return '';
     }

     getDeleteButtonTooltip(): string {
          if (this.txUiService.spinner()) {
               return 'Deleting DID from the XRPL';
          }
          return '';
     }

     allFieldsValid = computed(() => {
          return (
               this.didUtilService.didDocumentDataIsValid() && this.didUtilService.uriDataIsValid() && this.didUtilService.didDataIsValid() && !this.hasJsonSyntaxError() && this.validDidSchema() // optional: keep schema check if you want stricter
          );
     });

     validDidSchema = computed(() => {
          // Assume your utilsService.validateAndConvertDidJson can be called without throwing
          // Or separate syntax check from schema check if needed
          if (this.txUiService.didData().trim() === '' || this.hasJsonSyntaxError()) return false;

          const result = this.utilsService.validateAndConvertDidJson(this.txUiService.didData(), didSchema);
          return result.success;
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          // Sync initial value
          this.txUiService.didData.set(this.txUiService.didDetails().data);
          this.txUiService.uriData.set(this.txUiService.didDetails().uri);
          this.txUiService.didDocumentData.set(this.txUiService.didDetails().document);
          this.txUiService.clearAllOptions();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     toggleCreatedDids() {
          this.txUiService.createdDids.update(val => !val);
     }

     copyDidIndex(didIndex: string) {
          navigator.clipboard.writeText(didIndex).then(() => {
               this.txUiService.showToastMessage('DID Index copied!');
          });
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getDidForAccount();
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getDidForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getDidForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh: forceRefresh,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.didUtilService.getExistingDid(env.accountObjects, env.wallet.classicAddress);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getDidForAccount:', error);
                    this.toastService.error(error.message || 'Error getting did detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          // Declare variables we need after the timed block
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null; // we'll store env here
          let currentTab = this.activeTab();

          // 1. Common reset & guard clauses (not timed)
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.ensureWalletSelected()) return;

          // Only time the real work (validation → execution)
          await this.withPerf('performAction', async () => {
               let action: 'setDid' | 'deleteDid';
               let extra: any = {};
               let errorPrefix = '';

               // Map tab → action config
               switch (currentTab) {
                    case 'set':
                         action = 'setDid';
                         break;
                    case 'delete':
                         action = 'deleteDid';
                         break;
                    default:
                         this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                         return;
               }

               // Early validation / guard
               if (currentTab === 'set') {
                    console.log('Here');
               }

                 

               // Prepare environment
               let env;
               try {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    envRef = env; // save reference for later

                    const didFound = envRef.accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'DID';
                    });

                    if (!didFound) {
                         this.txUiService.setError('DID not found.');
                         return;
                    }

               if (currentTab === 'delete' && !this.txUiService.credentialID()) {
                    this.toastService.error('No DID selected.', AppConstants.TOAST.ERROR);
                    return;
               }
               } catch (err: any) {
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    console.error(err);
                    return;
               }

               // Execute via orchestrator
               try {
                    console.log('Here', envRef);
                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...(currentTab === 'set' ? this.didUtilService.setDidKeySpecificKeys : []), ...(currentTab === 'delete' ? this.didUtilService.deleteSpecificKeys : []))),
                    };

                    txResult = await this.didTransactionOrchestratorService.executeDidTx(action, {
                         wallet: this.currentWallet(),
                         formValues,
                         extra,
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });
               } catch (error: any) {
                    console.error(`Error in ${action}:`, error);
                    this.toastService.error(error.message || errorPrefix, AppConstants.TOAST.ERROR);
               }
          });

          // UI refresh & side-effects — after timing ends
          if (!this.txUiService.isSimulateEnabled() && txResult) {
               // await this.handleTxResult(txResult, envRef.client, envRef.wallet, destination, credentialIssuer, '');
          }
          this.txUiService.resetCurrentStepToIdle();
     }

     // private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, credentialIssuer: string | null, errorMessage: string): Promise<boolean> {
     //           if (!result.success) {
     //                this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
     //                return false;
     //           }

     //           await this.refreshAfterTx(client, wallet, destination, credentialIssuer);

     //           return true;
     //      }

     //      private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, credentialIssuer: string | null): Promise<void> {
     //                const env = await this.txEnvironmentService.prepareTxEnvironment({
     //                     includeAccountInfo: true,
     //                     includeAccountObject: true,
     //                     forceRefresh: true,
     //                });

     //                this.updateLocalAccountState(env);

     //                const addresses = [wallet.classicAddress];
     //                if (destination) addresses.push(destination);
     //                if (credentialIssuer) addresses.push(credentialIssuer);

     //                await this.refreshWallets(client, addresses);

     //                this.addCustomDestination(destination);
     //                this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     //           }

     //           private updateLocalAccountState(env: any): void {
     //                this.txUiService.existingCredentials.set(this.credentialUtilService.getExistingCredentials(env.accountObjects, env.wallet.classicAddress));
     //                this.txUiService.subjectCredentials.set(this.credentialUtilService.getSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     //           }

     async setDid() {
          await this.withPerf('setDid', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              fee,
                              currentLedger,
                         },
                         did: {
                              document: this.txUiService.didDetails().document || undefined,
                              uri: this.txUiService.didDetails().uri || undefined,
                              data: this.txUiService.didDetails().data || undefined,
                         },
                    });

                    const errors = await this.validationService.validate('DIDSet', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    let didSetTx: DIDSet = {
                         TransactionType: 'DIDSet',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, didSetTx, wallet, accountInfo, 'DIDSet');

                    const result = await this.txExecutor.setDid(didSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Set DID successfully' : 'Set DID successfully!';
                    await this.refreshAfterTx(client, wallet);
               } catch (error: any) {
                    console.error('Error in setDid:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteDid() {
          await this.withPerf('deleteDid', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              fee,
                              currentLedger,
                         },
                    });

                    const errors = await this.validationService.validate('DIDdelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const didFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'DID';
                    });

                    if (!didFound) {
                         this.txUiService.setError('DID not found.');
                         return;
                    }

                    const didDeleteTx: DIDDelete = {
                         TransactionType: 'DIDDelete',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, didDeleteTx, wallet, accountInfo, 'deleteDID');

                    const result = await this.txExecutor.deleteDid(didDeleteTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated DID deletion successfully!' : 'DID deleted successfully!';
                    await this.refreshAfterTx(client, wallet);
               } catch (error: any) {
                    console.error('Error in deleteDid:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, didTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string): Promise<void> {
          if (txType === 'DIDSet') {
               if (this.txUiService.didDetails().document) {
                    const hex = this.utilsService.jsonToHex({ didData: this.txUiService.didDetails().document });
                    didTx.DIDDocument = hex;
               }
               if (this.txUiService.didDetails().uri) {
                    const hex = this.utilsService.jsonToHex({ uri: this.txUiService.didDetails().uri });
                    didTx.URI = hex;
               }
               if (this.txUiService.didDetails().data) {
                    const result = this.utilsService.validateAndConvertDidJson(this.txUiService.didDetails().data, didSchema);
                    if (!result.success) throw new Error(result.errors ?? 'Invalid DID data');
                    didTx.Data = result.hexData;
               }
          }

          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(didTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(didTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.didUtilService.getExistingDid(accountObjects, wallet.classicAddress);
          await this.refreshWallets(client, [wallet.classicAddress]);
          this.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     validateDidData() {
          if (this.txUiService.didDetails().data) {
               const result = this.utilsService.validateAndConvertDidJson(this.txUiService.didDetails().data, didSchema);
               if (result.success) {
                    this.txUiService.clearAllOptionsAndMessages();
               } else {
                    return this.txUiService.setError(`${result.errors}`);
               }
          }
     }

     clearFields() {
          this.didUtilService.onDidDataChange('');
          this.txUiService.didData();
          this.didUtilService.onUriDataChange('');
          this.txUiService.uriData();
          this.didUtilService.onDidDocumentDataChange('');
          this.txUiService.didDocumentData();
     }
}
