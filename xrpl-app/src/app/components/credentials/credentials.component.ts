import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { rippleTimeToISOTime } from 'xrpl';
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
import { CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';

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
     public readonly credentialUtilService = inject(CredentialUtilService);
     private readonly cdr = inject(ChangeDetectorRef);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);

     credentialIdSearchQuery = signal<string>('');
     credentialIdSearchTerm = signal<string>('');
     existingCredentials = signal<CredentialItem[]>([]);
     selectedCredentials = signal<CredentialItem | null>(null);
     subjectCredentials = signal<CredentialItem[]>([]);

     // Filtered credentials — derived state, fully reactive
     filteredExisting = computed(() => this.filterCredentials(this.existingCredentials(), this.credentialIdSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.subjectCredentials(), this.credentialIdSearchTerm()));

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly createCredentialKeySpecificKeys = [] as const;
     private readonly deleteCredentialKeySpecificKeys = ['credentialID', 'credentialIssuer'] as const;
     private readonly acceptCredentialKeySpecificKeys = ['credentialType', 'credentialIssuer'] as const;

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
               pending: !this.credentialUtilService.isCredentialAccepted(cred) && this.activeTab() === 'accept',
          }));
     });

     selectedCredentialItem = computed(() => {
          const id = this.txUiService.credentialID();
          if (!id) return null;
          return this.credentialItems().find(i => i.id === id) || null;
     });

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.txUiService.credentialID.set('');
               this.txUiService.credentialType.set('');
               return;
          }

          const cred = [...this.existingCredentials(), ...this.subjectCredentials()].find(c => c.index === item.id);

          if (cred) {
               this.selectedCredentials.set(cred);
               this.txUiService.credentialID.set(cred.index);
               this.txUiService.credentialIssuer.set(cred.Issuer);
               this.txUiService.credentialType.set(cred.CredentialType || '');
          }
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.credentialIdSearchQuery.set(value);
     }

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;
          const tab = this.activeTab();

          const walletName = wallet.name || 'Selected wallet';
          const issuedByMe = this.existingCredentials();
          const issuedToMe = this.subjectCredentials();

          const pendingToAccept = issuedToMe.filter(c => !this.credentialUtilService.isCredentialAccepted(c));
          const acceptedByMe = issuedToMe.filter(c => this.credentialUtilService.isCredentialAccepted(c));
          const pendingIssued = issuedByMe.filter(c => !this.credentialUtilService.isCredentialAccepted(c));
          const acceptedIssued = issuedByMe.filter(c => this.credentialUtilService.isCredentialAccepted(c));

          let credentialsToShow: CredentialItem[] = [];

          switch (tab) {
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
               mode: tab,
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
          this.txUiService.clearOptionalExpirationDate();
          if (this.hasWallets()) {
               await this.getAllCredentialsForAccount();
          }
     }

     async getAllCredentialsForAccount(): Promise<void> {
          await this.withPerf('getAllCredentials', async () => {
               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
               });

               if (!env.accountInfo || !env.accountObjects) {
                    this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                    return;
               }
               this.existingCredentials.set(this.credentialUtilService.parseIssuedCredentials(env.accountObjects, env.wallet.classicAddress));
               this.subjectCredentials.set(this.credentialUtilService.parseSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
          });
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getCredentialsForAccount', true, async () => {
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

                    this.existingCredentials.set(this.credentialUtilService.parseIssuedCredentials(env.accountObjects, env.wallet.classicAddress));
                    this.subjectCredentials.set(this.credentialUtilService.parseSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.clearFields();
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.toastService.error(error.message || 'Error getting credential detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
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
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         destinationAddress: destination,
                    });

                    console.debug('expirationDate:', this.txUiService.credential().subject.expirationDate);
                    const expirationRipple = this.utilsService.toRippleTime(this.txUiService.credential().subject.expirationDate || '');
                    console.debug('expirationRipple:', expirationRipple);

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.createCredentialKeySpecificKeys)),
                    };

                    const result = await this.credentialTransactionOrchestratorService.executeCredentialTx('createCredential', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { credentialType: this.txUiService.credential().credential_type, expirationRipple: expirationRipple, subject: destination, uri: this.txUiService.credential().uri ? this.txUiService.credential().uri : '' },
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
               } catch (error: any) {
                    console.error('Error in createCredential:', error);
                    this.toastService.error(error.message || 'Error create credential', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteCredentials() {
          await this.withPerf('deleteCredentials', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const credentialID = this.txUiService.credentialID();
                    if (!credentialID) {
                         this.toastService.error('Credential ID cannot be blank.', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const credentialFound = env.accountObjects?.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.index === credentialID;
                    });

                    if (!credentialFound) {
                         this.toastService.error('Credential not found.', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.deleteCredentialKeySpecificKeys)),
                    };

                    const result = await this.credentialTransactionOrchestratorService.executeCredentialTx('deleteCredentials', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { credentialType: (credentialFound as any)?.CredentialType, subject: (credentialFound as any)?.Subject },
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
                         await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to delete credentials');
                    }
                    this.resetCredentialIdDropDown();
               } catch (error: any) {
                    console.error('Error in deleteCredentials:', error);
                    this.toastService.error(error.message || 'Error deleting credential', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async acceptCredentials() {
          await this.withPerf('acceptCredentials', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const credentialFound = env.accountObjects?.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.Subject === env.wallet.classicAddress; // && line.index === this.credentialID();
                    });

                    if (!credentialFound) {
                         this.toastService.error('Credential not found.', AppConstants.TOAST.ERROR);
                         return;
                    }

                    if (this.utilsService.isRippleExpired((credentialFound as any)?.Expiration)) {
                         this.toastService.error('Credential has expired.', AppConstants.TOAST.ERROR);
                         return;
                    }

                    console.debug(`credentialFound for ${env.wallet.classicAddress} ${JSON.stringify(credentialFound, null, '\n')}`);
                    console.debug(`credentialFound:`, credentialFound);
                    this.txUiService.credentialType.set((credentialFound as any)?.CredentialType);
                    this.txUiService.credentialIssuer.set((credentialFound as any)?.Issuer);

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.acceptCredentialKeySpecificKeys)),
                    };

                    const result = await this.credentialTransactionOrchestratorService.executeCredentialTx('acceptCredentials', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: {},
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
                         await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to accept credentials');
                    }
               } catch (error: any) {
                    console.error('Error in acceptCredentials:', error);
                    this.toastService.error(error.message || 'Error accepting credential', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async verifyCredential(binary: boolean): Promise<boolean> {
          return this.measure('verifyCredential', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return false;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { accountInfo, client } = env;

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo },
                         credentials: { credentialId: this.txUiService.credentialID(), credentialType: this.txUiService.credentialType() },
                    });

                    const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });

                    if (errors.length > 0) {
                         this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
                         return false;
                    }

                    const selected = this.selectedCredentials();
                    if (!selected) {
                         this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
                         return false;
                    }

                    // Encode credential type
                    let credentialTypeHex = '';
                    const credentialType = selected.CredentialType ?? '';

                    if (binary) {
                         credentialTypeHex = credentialType.toUpperCase();
                    } else {
                         credentialTypeHex = xrpl.convertStringToHex(credentialType).toUpperCase();
                         console.info(`Raw credential_type ${credentialType} Encoded credential_type as hex: ${credentialTypeHex}`);
                    }

                    if (credentialTypeHex.length % 2 !== 0 || !AppConstants.CREDENTIAL_REGEX.test(credentialTypeHex)) {
                         this.toastService.error('Credential type must be 128 characters as hexadecimal.', AppConstants.TOAST.ERROR);
                         return false;
                    }

                    const ledgerEntryRequest = {
                         command: 'ledger_entry',
                         credential: {
                              subject: selected.Subject ?? '',
                              issuer: env.wallet.classicAddress,
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
                              this.toastService.error('Credential not found.', AppConstants.TOAST.ERROR);
                              return false;
                         }

                         this.toastService.error(`Failed to check credential: ${error.message || 'Unknown error'}`, AppConstants.TOAST.ERROR);
                         return false;
                    }

                    this.txUiService.setTxResultSignal(xrplResponse.result);

                    const credential = (xrplResponse.result as any).node;
                    console.info('Found credential:', credential);

                    // Accepted check
                    if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
                         console.info('Credential is not accepted.');
                         this.toastService.error('Credential is not accepted.', AppConstants.TOAST.ERROR);
                         return false;
                    }

                    // Expiration check (no extra XRPL call)
                    if (credential.Expiration) {
                         const currentRippleTime = Math.floor(Date.now() / 1000) - AppConstants.RIPPLE_EPOCH_OFFSET;

                         const expirationISO = rippleTimeToISOTime(credential.Expiration);
                         console.info(`Credential expires at: ${expirationISO}`);

                         if (currentRippleTime > credential.Expiration) {
                              console.info('Credential is expired.');
                              this.toastService.error('Credential is expired.', AppConstants.TOAST.ERROR);
                              return false;
                         }
                    }

                    console.info('Credential is verified.');

                    this.txUiService.setSuccess(this.txUiService.result());
                    this.toastService.success(`Credential is verified.`, AppConstants.TOAST.SUCCESS, false);

                    return true;
               } catch (error: any) {
                    console.error('Error in verifyCredential:', error);
                    this.toastService.error(error.message || 'Error verify credential', AppConstants.TOAST.ERROR);
                    return false;
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
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
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               forceRefresh: true,
          });

          this.updateLocalAccountState(env);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     }

     private updateLocalAccountState(env: any): void {
          this.existingCredentials.set(this.credentialUtilService.getExistingCredentials(env.accountObjects, env.wallet.classicAddress));
          this.subjectCredentials.set(this.credentialUtilService.getSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
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

     private addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     private filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => [c.CredentialType, c.Issuer, c.Subject, c.index].some(f => f?.toLowerCase().includes(lower)));
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
          let currentDateStr = this.txUiService.credential().subject.expirationDate;
          if (!currentDateStr) {
               currentDateStr = this.formatDateTimeLocal(new Date());
          }

          const date = new Date(currentDateStr);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          // Update nested signal immutably
          this.txUiService.credential.update(cred => ({
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

          this.txUiService.credential.update(cred => ({
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

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     // copyCredentialId(checkId: string) {
     //      navigator.clipboard.writeText(checkId).then(() => {
     //           this.txUiService.showToastMessage('Credential Id copied!');
     //      });
     // }

     resetCredentialIdDropDown() {
          this.selectedCredentials.set(null);
          this.txUiService.credentialID.set('');
          this.txUiService.credentialType.set('');
          this.txUiService.credentialIssuer.set('');
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
}
