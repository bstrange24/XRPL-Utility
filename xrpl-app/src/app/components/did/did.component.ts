import { animate, style, transition, trigger } from '@angular/animations';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { DIDDelete, DIDSet } from 'xrpl';
import { DropdownItem } from '../../models/dropdown-item.model';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import didSchema from './did-schema.json';

import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';

import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

interface DidItem {
     index: string;
     DIDDocument: string;
     Data: string;
     URI: string;
}

interface DidData {
     id: string;
     verificationMethod: any;
     authentication: any;
     service: any;
     hash: string;
     uri: string;
     document: string;
     data: string;
     destinationAddress: string;
}

@Component({
     selector: 'app-did',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './did.component.html',
     styleUrl: './did.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);

     // Services
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     private readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;

     // Reactive State (Signals)
     activeTab = signal<'set' | 'delete'>('set');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);

     credentialSearchTerm = signal<string>('');
     infoPanelExpanded = signal(false);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);

     createdDids = signal<boolean>(false);
     existingDid = signal<DidItem[]>([]);

     // DID  Form Data
     didDetails = signal<DidData>({
          id: '',
          verificationMethod: {
               id: '',
               type: '',
               controller: '',
               publicKeyBase58: '',
          },
          authentication: {
               auth: '',
          },
          service: {
               serviceId: '',
               serviceType: '',
               serviceEndpoint: '',
          },
          hash: '',
          uri: 'ipfs://bafybeiexamplehash',
          document: 'did:example:123#public-key-0',
          // data: ``,
          data: `{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc",
  "authentication": [
    "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc#keys-1"
  ]
}`,
          destinationAddress: '',
     });

     url = signal<string>('');
     credentialData = signal<string>('');
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     createdCredentials = signal<boolean>(true);
     subjectCredential = signal<boolean>(true);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     explorerUrl = computed(() => {
          const env = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          return AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) {
               return null;
          }

          const walletName = wallet.name || 'Selected wallet';
          const dids = this.existingDid();
          const didCount = dids.length;
          const mode = this.activeTab();

          return {
               walletName,
               mode,
               didCount,
               existingDid: dids,
          };
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages(); // Reset shared state
     }

     ngOnInit(): void {
          this.setupWalletSubscriptions();
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    await this.getDidForAccount(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     trackByTicket(index: number, ticket: any) {
          return ticket;
     }

     toggleCreatedDids() {
          this.createdDids.update(val => !val);
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
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          this.txUiService.clearAllOptions();
          await this.getDidForAccount();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getDidForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getDidForAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', {
                         inputs: { seed: this.currentWallet().seed, accountInfo },
                         client,
                         accountInfo,
                    });

                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    // Just set the signal — computed() does all the work!
                    this.getExistingDid(accountObjects, wallet.classicAddress);
                    this.refreshUiState(wallet, accountInfo, accountObjects);

                    this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getDidForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async getDidForAccount1(forceRefresh = false): Promise<void> {
          await this.withPerf('getDidForAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    this.getExistingDid(accountObjects, wallet.classicAddress);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getDidForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setDid() {
          await this.withPerf('setDid', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    // const inputs = this.txUiService.getValidationInputs(this.currentWallet(), '');
                    // inputs.didDocument = this.didDetails().document || undefined;
                    // inputs.didUri = this.didDetails().uri || undefined;
                    // inputs.didData = this.didDetails().data || undefined;
                    // inputs.accountInfo = accountInfo;
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              fee,
                              currentLedger,
                         },
                         did: {
                              document: this.didDetails().document || undefined,
                              uri: this.didDetails().uri || undefined,
                              data: this.didDetails().data || undefined,
                         },
                    });

                    const errors = await this.validationService.validate('DIDSet', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });

                    if (!result.success) return;

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
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              fee,
                              currentLedger,
                         },
                    });
                    // const inputs = this.txUiService.getValidationInputs(this.currentWallet(), '');
                    // inputs.accountInfo = accountInfo;

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
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return;

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

     private getExistingDid(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'DID')
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         DIDDocument: obj.DIDDocument ? JSON.stringify(JSON.parse(Buffer.from(obj.DIDDocument, 'hex').toString('utf8')), null, 2) : 'N/A',
                         Data: obj.Data ? JSON.stringify(JSON.parse(Buffer.from(obj.Data, 'hex').toString('utf8')), null, 2) : 'N/A',
                         URI: obj.URI ? JSON.stringify(JSON.parse(Buffer.from(obj.URI, 'hex').toString('utf8')), null, 2) : 'N/A',
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.existingDid.set(mapped);
          this.utilsService.logObjects('existingDid', mapped);
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, didTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string): Promise<void> {
          if (txType === 'DIDSet') {
               if (this.didDetails().document) {
                    const hex = this.utilsService.jsonToHex({ didData: this.didDetails().document });
                    didTx.DIDDocument = hex;
               }
               if (this.didDetails().uri) {
                    const hex = this.utilsService.jsonToHex({ uri: this.didDetails().uri });
                    didTx.URI = hex;
               }
               if (this.didDetails().data) {
                    const result = this.utilsService.validateAndConvertDidJson(this.didDetails().data, didSchema);
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
          this.getExistingDid(accountObjects, wallet.classicAddress);
          await this.refreshWallets(client, [wallet.classicAddress]);
          this.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.multiSigningEnabled.set(hasSignerList);
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

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.txUiService.clearAllOptionsAndMessages();
     }
}
