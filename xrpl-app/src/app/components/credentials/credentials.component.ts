import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { rippleTimeToISOTime } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
// import { RequirementsInfoComponent } from '../../components/shared/requirements-info/requirements-info/requirements-info.component';
import { RequirementsInfoComponent } from './ui-components/credential-requirements-info/requirements-info/requirements-info.component';
import { ActivatedRoute } from '@angular/router';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, RequirementsInfoComponent],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends PerformanceBaseComponent implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
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
     public readonly route = inject(ActivatedRoute);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);

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
          void this.getCredentialsForAccount(false);
     });

     // Credential dropdown
     readonly credentialItems = computed(() => {
          const list = this.activeTab() === 'accept' ? this.txUiService.subjectCredentials() : this.txUiService.existingCredentials();

          return list.map(cred => ({
               id: cred.index,
               display: cred.CredentialType || 'Unknown Type',
               secondary: cred.index.slice(0, 12) + '...' + cred.index.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
               pending: !this.credentialUtilService.isCredentialAccepted(cred) && this.activeTab() === 'accept',
          }));
     });

     readonly selectedCredentialItem = computed(() => {
          const id = this.txUiService.credentialID();
          if (!id) return null;
          return this.credentialItems().find(i => i.id === id) || null;
     });

     readonly actionButtonLabel = computed(() => {
          switch (this.activeTab()) {
               case 'create':
                    return this.credentialUtilService.createCredentialButtonLabel();
               case 'accept':
                    return this.credentialUtilService.acceptCredentialsButtonLabel();
               case 'delete':
                    return this.credentialUtilService.deleteCredentialsButtonLabel();
               case 'verify':
                    return this.credentialUtilService.verifyCredentialLabel();
          }
     });

     readonly actionButtonClass = computed(() => {
          switch (this.activeTab()) {
               case 'create':
                    return 'btn-primary-blue';
               case 'accept':
                    return 'btn-primary-green';
               case 'delete':
                    return 'btn-primary-red';
               case 'verify':
                    return 'btn-primary-orange';
          }
     });

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (!info) return '';

          const { mode, issuedByMe, issuedToMe, pendingIssued, acceptedIssued, pendingToAccept, acceptedByMe } = info;

          switch (mode) {
               case 'create': {
                    if (issuedByMe.length === 0) return 'has not issued any credentials yet.';
                    const total = issuedByMe.length;
                    const pending = pendingIssued.length;
                    const accepted = acceptedIssued.length;
                    let msg = `has issued <strong>${total}</strong> credential${total === 1 ? '' : 's'}. `;
                    if (pending === 0) {
                         msg += '— all accepted!';
                    } else {
                         msg += `• ${accepted} accepted • <strong>${pending}</strong> pending acceptance`;
                    }
                    return msg;
               }

               case 'accept':
                    if (issuedToMe.length === 0) return 'has no credentials issued to it.';
                    if (pendingToAccept.length === 0) return 'has no pending credentials to accept — all accepted!';
                    return `has <strong>${pendingToAccept.length}</strong> pending credential${pendingToAccept.length === 1 ? '' : 's'} to accept.`;

               case 'delete':
                    if (issuedByMe.length === 0) return 'has no credentials to delete.';
                    return `has <strong>${issuedByMe.length}</strong> issued credential${issuedByMe.length === 1 ? '' : 's'} that can be deleted.`;

               case 'verify': {
                    const totalInvolved = issuedToMe.length + issuedByMe.length;
                    if (totalInvolved === 0) return 'is not involved in any credentials.';
                    let parts: string[] = [];
                    if (issuedToMe.length > 0) {
                         parts.push(`• ${pendingToAccept.length} pending to accept • ${acceptedByMe.length} accepted`);
                    }
                    if (issuedByMe.length > 0) {
                         parts.push(`• ${pendingIssued.length} issued & pending • ${acceptedIssued.length} accepted`);
                    }
                    return `is involved in <strong>${totalInvolved}</strong> credential${totalInvolved === 1 ? '' : 's'}: ${parts.join(' ')}`;
               }
          }
     });

     private readonly credentialsToShow = computed(() => {
          const tab = this.activeTab();
          switch (tab) {
               case 'create':
                    return [...this.credentialUtilService.pendingIssued(), ...this.credentialUtilService.acceptedIssued()];
               case 'accept':
                    return this.credentialUtilService.pendingToAccept().length ? this.credentialUtilService.pendingToAccept() : this.credentialUtilService.acceptedByMe();
               case 'delete':
                    return this.credentialUtilService.issuedByMe();
               case 'verify':
                    return [...this.credentialUtilService.pendingToAccept(), ...this.credentialUtilService.pendingIssued(), ...this.credentialUtilService.acceptedByMe(), ...this.credentialUtilService.acceptedIssued()];
          }
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const tab = this.activeTab();

          return {
               walletName: wallet.name || 'Selected wallet',
               mode: tab,
               issuedByMe: this.credentialUtilService.issuedByMe(),
               issuedToMe: this.credentialUtilService.issuedToMe(),
               pendingIssued: this.credentialUtilService.pendingIssued(),
               acceptedIssued: this.credentialUtilService.acceptedIssued(),
               pendingToAccept: this.credentialUtilService.pendingToAccept(),
               acceptedByMe: this.credentialUtilService.acceptedByMe(),
               credentialsToShow: this.credentialsToShow(),
          };
     });

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          const tab = this.route.snapshot.queryParamMap.get('tab');
          if (tab) {
               const allowedTabs = ['create', 'accept', 'delete', 'verify'] as const;
               type TabType = (typeof allowedTabs)[number];
               if (tab && allowedTabs.includes(tab as TabType)) {
                    // Type assertion is safe because we checked includes
                    this.setTab(tab as TabType);
               }
          }

          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
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

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.resetCredentialIdDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          this.txUiService.clearOptionalExpirationDate();
          if (this.hasWallets()) {
               await this.getCredentialsForAccount();
          }
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getCredentialsForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
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

     async performAction(): Promise<void> {
          // Declare variables we need after the timed block
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null; // we'll store env here
          let destination: string | null = null;
          let credentialIssuer: string | null = null;
          let currentTab = this.activeTab();

          // 1. Common reset & guard clauses (not timed)
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.ensureWalletSelected()) return;

          // 2. Early destination resolution (not timed)
          destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

          // Only time the real work (validation → execution)
          await this.withPerf('performAction', async () => {
               let action: 'createCredential' | 'acceptCredentials' | 'deleteCredentials' | 'verifyCredential';
               let extra: any = {};
               let errorPrefix = '';

               // Map tab → action config
               switch (currentTab) {
                    case 'create':
                         action = 'createCredential';
                         extra = {
                              credentialType: this.txUiService.credential().credential_type,
                              expirationRipple: this.utilsService.toRippleTime(this.txUiService.credential().subject.expirationDate || ''),
                              subject: destination,
                              uri: this.txUiService.credential().uri || '',
                         };
                         break;
                    case 'accept':
                         action = 'acceptCredentials';
                         break;
                    case 'delete':
                         action = 'deleteCredentials';
                         extra = {
                              credentialType: this.txUiService.credentialType(),
                              subject: this.txUiService.credential().subject,
                         };
                         break;
                    case 'verify':
                         action = 'verifyCredential';
                         errorPrefix = 'Failed to verify credential';
                         await this.handleVerifyCredential();
                         return;
                    default:
                         this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                         return;
               }

               // Early validation / guard
               if (currentTab === 'create') {
                    if (!destination || !xrpl.isValidAddress(destination)) {
                         this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
                         return;
                    }
               }

               if ((currentTab === 'accept' || currentTab === 'delete') && !this.txUiService.credentialID()) {
                    this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
                    return;
               }

               // Prepare environment
               let env;
               try {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         ...(currentTab === 'create' ? { destinationAddress: extra.subject } : {}),
                    });

                    envRef = env; // save reference for later

                    // credential lookup for accept/delete
                    if (currentTab === 'delete' || currentTab === 'accept') {
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

                         if (currentTab === 'accept') {
                              if ((credentialFound as any)?.Flags == AppConstants.LSF_ACCEPTED) {
                                   console.info('Credential has already been accepted.');
                                   this.toastService.info('Credential has already been accepted.', AppConstants.TOAST.SUCCESS);
                                   return;
                              }

                              if (this.utilsService.isRippleExpired((credentialFound as any)?.Expiration)) {
                                   this.toastService.error('Credential has expired.', AppConstants.TOAST.ERROR);
                                   return;
                              }
                              this.txUiService.credentialType.set((credentialFound as any)?.CredentialType);
                              this.txUiService.credentialIssuer.set((credentialFound as any)?.Issuer);
                              credentialIssuer = this.txUiService.credentialIssuer();
                         } else {
                              extra = { credentialType: (credentialFound as any)?.CredentialType, subject: (credentialFound as any)?.Subject };
                         }
                    }
               } catch (err: any) {
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    console.error(err);
                    return;
               }

               // Execute via orchestrator
               try {
                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...(currentTab === 'create' ? this.credentialUtilService.createCredentialKeySpecificKeys : []), ...(currentTab === 'delete' ? this.credentialUtilService.deleteCredentialKeySpecificKeys : []), ...(currentTab === 'accept' ? this.credentialUtilService.acceptCredentialKeySpecificKeys : []))),
                    };

                    txResult = await this.credentialTransactionOrchestratorService.executeCredentialTx(action, {
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
               await this.handleTxResult(txResult, envRef.client, envRef.wallet, destination, credentialIssuer, '');
               if (currentTab === 'delete') {
                    this.resetCredentialIdDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private async handleVerifyCredential(): Promise<boolean> {
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
               credentials: {
                    credentialId: this.txUiService.credentialID(),
                    credentialType: this.txUiService.credentialType(),
               },
          });

          const errors = await this.validationService.validate('CredentialVerify', {
               inputs,
               client,
               accountInfo,
          });

          if (errors.length > 0) {
               this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
               return false;
          }

          const selected = this.txUiService.selectedCredentials();
          if (!selected) {
               this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
               return false;
          }

          // Encode credential type
          let credentialTypeHex = '';
          const credentialType = selected.CredentialType ?? '';

          credentialTypeHex = xrpl.convertStringToHex(credentialType).toUpperCase();
          console.info(`Raw credential_type ${credentialType} Encoded credential_type as hex: ${credentialTypeHex}`);

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
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, credentialIssuer: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, destination, credentialIssuer);

          this.clearInputFields();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, credentialIssuer: string | null): Promise<void> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               forceRefresh: true,
          });

          this.refreshAccountObject(env);

          const addresses = [wallet.classicAddress];
          if (destination) addresses.push(destination);
          if (credentialIssuer) addresses.push(credentialIssuer);

          await this.refreshWallets(client, addresses);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     }

     private refreshAccountObject(env: any): void {
          this.txUiService.existingCredentials.set(this.credentialUtilService.getExistingCredentials(env.accountObjects, env.wallet.classicAddress));
          this.txUiService.subjectCredentials.set(this.credentialUtilService.getSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (_updatedList, newCurrent) => {
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

     selectCredentialFromList(cred: CredentialItem) {
          this.txUiService.selectedCredentials.set(cred);
          this.txUiService.credentialID.set(cred.index);
          this.txUiService.credentialIssuer.set(cred.Issuer);
          this.txUiService.credentialType.set(cred.CredentialType || '');

          if (this.activeTab() !== 'create') {
               // Optional: close the expanded list after selection (better UX in some cases)
               this.infoPanelExpanded.set(false);
               // Optional: scroll to the form / highlight the dropdown area
               // document.querySelector('.form-group')?.scrollIntoView({ behavior: 'smooth' });
          }
     }

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.credentialUtilService.applySelectedCredential(null);
               return;
          }

          const cred = [...this.txUiService.existingCredentials(), ...this.txUiService.subjectCredentials()].find(c => c.index === item.id);

          this.credentialUtilService.applySelectedCredential(cred || null);
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.txUiService.credentialIdSearchQuery.set(value);
     }

     onDestinationSelected(item: SelectItem | null) {
          this.selectedDestinationAddress.set(item?.id || '');
     }

     populateDefaultDateTime(): void {
          this.credentialUtilService.setCredentialExpirationToNow();
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
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

     resetCredentialIdDropDown() {
          this.txUiService.selectedCredentials.set(null);
          this.txUiService.credentialID.set('');
          this.txUiService.credentialType.set('');
          this.txUiService.credentialIssuer.set('');
     }
}
