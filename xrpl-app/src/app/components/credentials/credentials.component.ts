import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { CredentialAccept, CredentialCreate, CredentialDelete, rippleTimeToISOTime } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { animation, toastAnimation } from '../../services/animations/animations.service';
import { CredentialData, CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [animation, toastAnimation],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly sendXrpTransactionOrchestratorService = inject(SendXrpTransactionOrchestratorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly credentialTransactionOrchestratorService = inject(CredentialTransactionOrchestratorService);
     private readonly cdr = inject(ChangeDetectorRef);

     // Destination Dropdown
     typedDestination = signal<string>('');
     credentialIdSearchQuery = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);

     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     highlightedIndex = signal<number>(-1);
     highlightedCredentialIdIndex = signal<number>(-1);

     // Reactive State (Signals)
     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);

     // Credential lists
     existingCredentials = signal<CredentialItem[]>([]);
     subjectCredentials = signal<CredentialItem[]>([]);

     // Filtered credentials — derived state, fully reactive
     filteredExisting = computed(() => this.filterCredentials(this.existingCredentials(), this.credentialIdSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.subjectCredentials(), this.credentialIdSearchTerm()));

     // Form & UI State
     credentialIdSearchTerm = signal<string>('');
     credentialID = signal<string>('');
     credentialType = signal<string>('');
     selectedCredentials = signal<CredentialItem | null>(null);
     infoPanelExpanded = signal<boolean>(false);
     private decodeCache = new Map<string, string>();
     subject = signal<string>('');

     private readonly createCredentialKeySpecificKeys = [] as const;

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());

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
          void this.getCredentialsForAccount(true);
     });

     // Credential Form Data
     credential = signal<CredentialData>({
          version: '1.0',
          credential_type: 'KYCCredential',
          issuer: '',
          subject: {
               full_name: '',
               destinationAddress: '',
               dob: '',
               country: '',
               id_type: '',
               id_number: '',
               expirationDate: '',
          },
          verification: { method: '', verified_at: '', verifier: '' },
          hash: '',
          uri: 'ipfs://bafybeiexamplehash',
     });

     onDestinationSelected(item: SelectItem | null) {
          this.selectedDestinationAddress.set(item?.id || '');
     }

     // Credential dropdown
     credentialItems = computed(() => {
          const list = this.activeTab() === 'accept' ? this.subjectCredentials() : this.existingCredentials();

          return list.map(cred => ({
               id: cred.index,
               display: cred.CredentialType || 'Unknown Type',
               secondary: cred.index.slice(0, 12) + '...' + cred.index.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
               // Optional: add badge for pending
               pending: !this.isCredentialAccepted(cred) && this.activeTab() === 'accept',
          }));
     });

     selectedCredentialItem = computed(() => {
          const id = this.credentialID();
          if (!id) return null;
          return this.credentialItems().find(i => i.id === id) || null;
     });

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.credentialID.set('');
               this.credentialType.set('');
               return;
          }

          const cred = [...this.existingCredentials(), ...this.subjectCredentials()].find(c => c.index === item.id);

          if (cred) {
               this.selectedCredentials.set(cred);
               this.credentialID.set(cred.index);
               this.credentialType.set(cred.CredentialType || '');
          }
     }

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';
          const issuedByMe = this.existingCredentials();
          const issuedToMe = this.subjectCredentials();

          const pendingToAccept = issuedToMe.filter(c => !this.isCredentialAccepted(c));
          const acceptedByMe = issuedToMe.filter(c => this.isCredentialAccepted(c));
          const pendingIssued = issuedByMe.filter(c => !this.isCredentialAccepted(c));
          const acceptedIssued = issuedByMe.filter(c => this.isCredentialAccepted(c));

          let credentialsToShow: CredentialItem[] = [];

          switch (this.activeTab()) {
               case 'create':
                    credentialsToShow = [...pendingIssued, ...acceptedIssued];
                    break;
               case 'accept':
                    credentialsToShow = pendingToAccept.length ? pendingToAccept : acceptedByMe;
                    break;
               case 'delete':
                    credentialsToShow = issuedByMe;
                    break;
               case 'verify':
                    credentialsToShow = [...pendingToAccept, ...pendingIssued, ...acceptedByMe, ...acceptedIssued];
                    break;
               default:
                    credentialsToShow = issuedByMe;
          }

          return {
               walletName,
               mode: this.activeTab(),
               issuedByMe,
               issuedToMe,
               pendingIssued,
               acceptedIssued,
               pendingToAccept,
               acceptedByMe,
               credentialsToShow,
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.populateDefaultDateTime();
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     // onSelectCredentials(credential: CredentialItem | null) {
     //      if (!credential) {
     //           this.resetCredentialIdDropDown();
     //           return;
     //      }
     //      // Keep the search term that led to this selection!
     //      this.selectedCredentials.set(credential); // store the whole object
     //      this.credentialID.set(credential.index);
     //      this.credentialType.set(credential.CredentialType || '');
     // }

     trackByCredentialIndex(index: number, cred: CredentialItem) {
          return cred.index;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     trackByTicket(index: number, ticket: any) {
          return ticket;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.resetCredentialIdDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          this.populateDefaultDateTime();
          if (this.hasWallets()) {
               await this.getAllCredentialsForAccount();
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAllCredentialsForAccount(): Promise<void> {
          await this.withPerf('getAllCredentials', async () => {
               const wallet = await this.getWallet();
               const accountObjects = await this.xrplCache.getAccountObjects(await this.getClient(), wallet.classicAddress, false);
               this.parseCredentials(accountObjects, wallet.classicAddress);
          });
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getCredentialsForAccount', async () => {
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

                    this.parseCredentials(env.accountObjects, env.wallet.classicAddress);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createCredential() {
          await this.withPerf('createCredential', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    // const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    // const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    // const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         destinationAddress: destination,
                    });

                    console.debug('expirationDate:', this.credential().subject.expirationDate);
                    const expirationRipple = this.utilsService.toRippleTime(this.credential().subject.expirationDate || '');
                    console.debug('expirationRipple:', expirationRipple);

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.createCredentialKeySpecificKeys)),
                    };

                    const result = await this.credentialTransactionOrchestratorService.executeCredentialTx('createCredential', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { credentialType: this.credential().credential_type, expirationRipple: expirationRipple },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env.client, env.wallet, destination, 'Failed to create credentials');
                    }

                    // const inputs = this.txUiService.getValidationInputs({
                    //      wallet: this.currentWallet(),
                    //      network: { accountInfo, fee, currentLedger },
                    //      credentials: { credentialType: this.credential().credential_type, subject: destinationAddress, date: expirationRipple },
                    // });

                    // const errors = await this.validationService.validate('CredentialCreate', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.join('\n• '));
                    // }

                    // const credentialCreateTx: CredentialCreate = {
                    //      TransactionType: 'CredentialCreate',
                    //      Account: wallet.classicAddress,
                    //      CredentialType: Buffer.from(this.credential().credential_type || 'defaultCredentialType', 'utf8').toString('hex'),
                    //      Subject: destinationAddress,
                    //      Expiration: expirationRipple,
                    //      Fee: fee,
                    //      LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    // };

                    // await this.setTxOptionalFields(client, credentialCreateTx, wallet, accountInfo, 'createCredential');

                    // const result = await this.txExecutor.createCredential(credentialCreateTx, wallet, client, {
                    //      useMultiSign: this.txUiService.useMultiSign(),
                    //      isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                    //      regularKeySeed: this.txUiService.regularKeySeed(),
                    //      multiSignAddress: this.txUiService.multiSignAddress(),
                    //      multiSignSeeds: this.txUiService.multiSignSeeds(),
                    // });
                    // if (!result.success) return this.txUiService.setError(`${result.error}`);

                    // this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Setting Credential successfully!' : 'Created credential successfully!';
                    // await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createCredential:', error);
                    this.toastService.error(error.message || 'Error create vredential', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteCredentials() {
          await this.withPerf('deleteCredentials', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, fee, currentLedger },
                         credentials: { credentialId: this.credentialID() },
                    });

                    const errors = await this.validationService.validate('CredentialDelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.index === this.credentialID();
                    });

                    if (!credentialFound) {
                         this.txUiService.setError('Credential not found.');
                         return;
                    }

                    const credentialDeleteTx: CredentialDelete = {
                         TransactionType: 'CredentialDelete',
                         Account: wallet.classicAddress,
                         CredentialType: (credentialFound as any)?.CredentialType,
                         Subject: (credentialFound as any)?.Subject,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialDeleteTx, wallet, accountInfo, 'deleteCredentials');

                    const result = await this.txExecutor.deleteCredential(credentialDeleteTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Credential delete successfully!' : 'Credential removed successfully!';
                    // await this.refreshAfterTx(client, wallet, null, false);
                    this.resetCredentialIdDropDown();
               } catch (error: any) {
                    console.error('Error in deleteCredentials:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async acceptCredentials() {
          await this.withPerf('acceptCredentials', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                         },
                         credentials: { credentialId: this.credentialID() },
                    });

                    const errors = await this.validationService.validate('CredentialAccept', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.Subject === wallet.classicAddress; // && line.index === this.credentialID();
                    });

                    if (!credentialFound) {
                         this.txUiService.setError('Credential not found.');
                         return;
                    }

                    console.debug(`credentialFound for ${wallet.classicAddress} ${credentialFound}`);
                    console.debug(`credentialFound:`, credentialFound);

                    const credentialAcceptTx: CredentialAccept = {
                         TransactionType: 'CredentialAccept',
                         Account: wallet.classicAddress,
                         Issuer: (credentialFound as any)?.Issuer,
                         CredentialType: (credentialFound as any)?.CredentialType,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialAcceptTx, wallet, accountInfo, 'acceptCredentials');

                    const result = await this.txExecutor.acceptCredential(credentialAcceptTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated accepting credential successfully!' : 'Credential accepted successfully!';
                    // await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in acceptCredentials:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async verifyCredential(binary: boolean): Promise<boolean | void> {
          await this.withPerf('verifyCredential', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const accountInfo = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                         },
                         credentials: {
                              credentialId: this.credentialID(),
                         },
                    });

                    const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         this.txUiService.isSuccess.set(false);
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const selected = this.selectedCredentials();
                    if (!selected) {
                         this.txUiService.setError('No credential selected.');
                         return;
                    }

                    // Encode credentialType as uppercase hex, if needed
                    let credentialTypeHex = '';
                    const credentialType = this.selectedCredentials()?.CredentialType ?? '';
                    if (binary) {
                         credentialTypeHex = credentialType.toUpperCase();
                    } else {
                         credentialTypeHex = xrpl.convertStringToHex(credentialType).toUpperCase();
                         console.info(`Raw credential_type ${credentialType} Encoded credential_type as hex: ${credentialTypeHex}`);
                    }

                    if (credentialTypeHex.length % 2 !== 0 || !AppConstants.CREDENTIAL_REGEX.test(credentialTypeHex)) {
                         // Hexadecimal is always 2 chars per byte, so an odd length is invalid.
                         this.txUiService.setError(`Credential type must be 128 characters as hexadecimal.`);
                         return;
                    }

                    // Perform XRPL lookup of Credential ledger entry
                    const credentialSubject = this.selectedCredentials()?.Subject ?? '';
                    const ledgerEntryRequest = {
                         command: 'ledger_entry',
                         credential: {
                              subject: credentialSubject,
                              issuer: wallet.classicAddress,
                              credential_type: credentialTypeHex,
                         },
                         ledger_index: 'validated',
                    };

                    console.info('Looking up credential...', ledgerEntryRequest);
                    this.txUiService.setTxSignal(ledgerEntryRequest);

                    let xrplResponse;
                    try {
                         xrplResponse = await client.request(ledgerEntryRequest as any);
                    } catch (error: any) {
                         if (error.data?.error === 'entryNotFound') {
                              console.info('Credential was not found');
                              this.txUiService.setTxResultSignal(error.data);
                              this.txUiService.setError(`Credential not found.`);
                              return;
                         } else {
                              this.txUiService.setTxResultSignal(xrplResponse);
                              this.txUiService.setError(`Failed to check credential: ${error.message || 'Unknown error'}`);
                              return;
                         }
                    }

                    this.txUiService.setTxResultSignal(xrplResponse.result);

                    const credential = (xrplResponse.result as any).node;
                    console.info(`Found credential:`, credential);

                    // Check if the credential has been accepted
                    if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
                         console.info('Credential is not accepted.');
                         this.txUiService.setTxResultSignal(xrplResponse.result);
                         this.txUiService.setError('Credential is not accepted.');
                         return;
                    }

                    // Confirm that the credential is not expired
                    if (credential.Expiration) {
                         const expirationTime = rippleTimeToISOTime(credential.Expiration);
                         console.info(`Credential has expiration: ${expirationTime}`);
                         console.info('Looking up validated ledger to check for expiration.');
                         let ledgerResponse;
                         try {
                              ledgerResponse = await client.request({
                                   command: 'ledger',
                                   ledger_index: 'validated',
                              });
                         } catch (error: any) {
                              this.txUiService.setError(`Failed to check credential: ${error.message || 'Unknown error'}`);
                              return;
                         }
                         const closeTime = rippleTimeToISOTime(ledgerResponse.result.ledger.close_time);
                         console.info(`Most recent validated ledger is: ${closeTime}`);
                         if (new Date(closeTime) > new Date(expirationTime)) {
                              console.info('Credential is expired.');
                              this.txUiService.setError(`Credential is expired.`);
                              return;
                         }

                         this.txUiService.setTxResultSignal(ledgerResponse.result);
                    }

                    // Credential has passed all checks
                    console.info('Credential is verified.');
                    this.txUiService.setSuccess(this.txUiService.result());
                    this.txUiService.successMessage = 'Credential is verified.';
                    return true;
               } catch (error: any) {
                    console.error('Error in verifyCredential:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, destination);

          this.clearInputFields();
          this.cdr.markForCheck();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          this.getExistingCredentials(accountObjects, wallet.classicAddress);
          this.getSubjectCredentials(accountObjects, wallet.classicAddress);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private decodeutf8Hex(hex: string | undefined): string {
          if (!hex) return 'N/A';
          if (this.decodeCache.has(hex)) return this.decodeCache.get(hex)!;

          try {
               const result = Buffer.from(hex, 'hex').toString('utf8') || 'N/A';
               this.decodeCache.set(hex, result);
               return result;
          } catch {
               this.decodeCache.set(hex, 'Invalid Hex');
               return 'Invalid Hex';
          }
     }

     private getExistingCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Issuer === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.existingCredentials.set(mapped);
          this.utilsService.logObjects('existingCredentials', mapped);
     }

     private getSubjectCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Subject === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.subjectCredentials.set(mapped);
          this.utilsService.logObjects('subjectCredentials', mapped);
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, credentialTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createCredential') {
               if (this.credential().uri) this.utilsService.setURI(credentialTx, this.credential().uri);
          }

          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(credentialTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(credentialTx, this.txUiService.memoField());
          }
     }

     // private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
     //      const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
     //      this.getExistingCredentials(accountObjects, wallet.classicAddress);
     //      this.getSubjectCredentials(accountObjects, wallet.classicAddress);
     //      destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
     //      if (addDest) this.addNewDestinationFromUser(destination || '');
     //      this.refreshUiState(wallet, accountInfo, accountObjects);
     //      this.txUiService.clearAllOptions();
     // }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     // private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
     //      await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
     //           this.currentWallet.set({ ...newCurrent });
     //      });
     // }

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

     private addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private parseCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string): void {
          const objs = accountObjects.result.account_objects ?? [];

          const issued = objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Issuer === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));

          const received = objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Subject === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));

          // Just set signals — infoData() recomputes automatically!
          this.existingCredentials.set(issued);
          this.subjectCredentials.set(received);
     }

     private mapCredential(obj: any): CredentialItem {
          return {
               index: obj.index,
               CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
               Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(obj.URI),
               Flags: this.utilsService.getCredentialStatus(obj.Flags),
          };
     }

     private filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => [c.CredentialType, c.Issuer, c.Subject, c.index].some(f => f?.toLowerCase().includes(lower)));
     }

     private addNewDestinationFromUser(destination: string): void {
          if (!destination || !xrpl.isValidAddress(destination)) return;

          // Use destinationItems() instead of destinations()
          const alreadyExists = this.destinationItems().some((item: { id: string }) => item.id === destination);
          if (alreadyExists) return;

          this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
          this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
          this.updateDestinations();
     }

     private addToDateTimeField(fieldSignal: Signal<string>, writableSignal: WritableSignal<string>, seconds: number): void {
          let currentValue = fieldSignal();

          // If field is empty, start from now
          if (!currentValue) {
               const now = new Date();
               currentValue = this.formatDateTimeLocal(now);
          }

          const date = new Date(currentValue);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          writableSignal.set(newDateTime);
     }

     // Helper to avoid duplicating formatting code
     private formatDateTimeLocal(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const secs = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${secs}`;
     }

     addCredentialToExpiration(seconds: number): void {
          // Get current value (or use now if empty)
          let currentDateStr = this.credential().subject.expirationDate;
          if (!currentDateStr) {
               currentDateStr = this.formatDateTimeLocal(new Date());
          }

          const date = new Date(currentDateStr);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          // Update nested signal immutably
          this.credential.update(cred => ({
               ...cred,
               subject: {
                    ...cred.subject,
                    expirationDate: newDateTime,
               },
          }));
     }

     setCredentialExpirationToNow(): void {
          const now = new Date();
          const formatted = this.formatDateTimeLocal(now);

          this.credential.update(cred => ({
               ...cred,
               subject: {
                    ...cred.subject,
                    expirationDate: formatted,
               },
          }));
     }

     populateDefaultDateTime(): void {
          this.setCredentialExpirationToNow();
     }

     copyCredentialId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Credential Id copied!');
          });
     }

     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags come from XRPL as number, but your utilsService.getCredentialStatus() returns object
          // So we check both possibilities
          if (typeof cred.Flags === 'number') {
               return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          }
          if (typeof cred.Flags === 'object') {
               return !!cred.Flags.lsfAccepted;
          }
          if (cred.Flags === 'Credential accepted') {
               return true;
          }
          return false;
     }

     resetCredentialIdDropDown() {
          this.selectedCredentials.set(null);
          this.credentialID.set('');
          this.credentialType.set('');
     }

     clearFields() {
          this.txUiService.clearAllOptions();
          this.txUiService.clearOptionalInputFields();
          this.txUiService.clearAllOptionsAndMessages();
          this.resetCredentialIdDropDown();
     }

     clearInputFields(): void {
          if (this.txUiService.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.txUiService.credentialIDs.set([]);
     }

     // selectCredentialId(domainId: string): void {
     //      this.credentialID.set(domainId); // Auto-fill the Domain ID field
     //      this.credentialIdSearchQuery.set(''); // Clear search
     //      this.closeCredentialIdDropdown();
     // }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.credentialIdSearchQuery.set(value);
     }
}
