import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { rippleTimeToISOTime } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
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
import { CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
// import { RequirementsInfoComponent } from '../../components/shared/requirements-info/requirements-info/requirements-info.component';
import { RequirementsInfoComponent } from './ui-components/credential-requirements-info/requirements-info/requirements-info.component';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplExpirationInputComponent } from '../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { XrplDateService } from '../../core/xrpl-date.service';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, XrplExpirationInputComponent, RequirementsInfoComponent],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends WalletDestinationBase implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly validationService = inject(ValidationService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly credentialTransactionOrchestratorService = inject(CredentialTransactionOrchestratorService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly transactionUiService = inject(TransactionUiService);
     public readonly xrplDateService = inject(XrplDateService);

     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');

     readonly vm = computed(() => {
          const tab = this.activeTab();
          const wallet = this.currentWallet();
          const address = wallet?.address ?? '';

          const credentialItems = this.credentialUtilService.credentialItems(tab, address);
          const credentialsToShow = this.credentialUtilService.credentialsToShow(tab);

          const selectedId = this.txUiService.credentialID();
          const selectedCredentialItem = selectedId ? (credentialItems.find(i => i.id === selectedId) ?? null) : null;

          return {
               tab,
               wallet,
               walletName: wallet?.name || 'Selected wallet',
               address,

               credentialItems,
               credentialsToShow,
               selectedCredentialItem,

               summaryMessage: this.credentialUtilService.summaryMessage(tab),
               actionButtonLabel: this.credentialUtilService.actionButtonLabel(tab),
               actionButtonClass: this.credentialUtilService.actionButtonClass(tab),

               hasCredentials: credentialsToShow.length > 0,
               isVerifyEmpty: tab === 'verify' && credentialItems.length === 0,
          };
     });

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['create', 'accept', 'delete', 'verify'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getCredentialsForAccount(false);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByCredentialIndex(_index: number, cred: CredentialItem) {
          return cred.index;
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.credentialUtilService.resetCredentialIdDropDown();
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

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.credentialUtilService.clearFields();
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

          if (!this.walletManagerService.ensureWalletSelected()) return;

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
                              expirationRipple: this.xrplDateService.toRippleTime(this.txUiService.credential().subject.expirationDate),
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
          // if (!this.txUiService.isSimulateEnabled() && txResult) {
          if (txResult) {
               await this.handleTxResult(txResult, envRef.client, envRef.wallet, destination, credentialIssuer, '');
               if (currentTab === 'delete') {
                    this.credentialUtilService.resetCredentialIdDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private async handleVerifyCredential(): Promise<boolean> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({ includeAccountInfo: true, includeLedgerInfo: true });
          const { accountInfo, client, ledgerInfo } = env;

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

          if (credential.Expiration) {
               if (this.xrplDateService.isExpired(credential.Expiration, ledgerInfo.currentRippleTime)) {
                    console.info('CCredential is verified but has expired.');
                    this.toastService.error('Credential is verified but has expired.', AppConstants.TOAST.ERROR);
                    return false;
               }

               const expirationISO = this.xrplDateService.rippleToISO(credential.Expiration);
               console.info(`Credential expires at: ${expirationISO}`);
          }

          console.info('Credential is verified.');

          this.txUiService.setSuccess(this.txUiService.result());
          this.toastService.success(`Credential is verified.`, AppConstants.TOAST.SUCCESS, false);

          return true;
     }

     protected refreshAccountObject(env: any): void {
          this.txUiService.existingCredentials.set(this.credentialUtilService.getExistingCredentials(env.accountObjects, env.wallet.classicAddress));
          this.txUiService.subjectCredentials.set(this.credentialUtilService.getSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     }

     protected clearInputFields(): void {
          this.credentialUtilService.clearInputFields();
     }

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.credentialUtilService.applySelectedCredential(null);
               return;
          }

          const cred = [...this.txUiService.existingCredentials(), ...this.txUiService.subjectCredentials()].find(c => c.index === item.id);

          if (!cred) return;

          const isVerifyTab = this.activeTab() === 'verify';
          const isSubject = cred.Subject === this.currentWallet().address;

          if (!isVerifyTab || !isSubject) {
               this.credentialUtilService.applySelectedCredential(cred);
          } else {
               // Optional: clear selection visually
               this.credentialUtilService.applySelectedCredential(null);
               this.toastService.info('Verification is typically performed by the issuer or a third party.', AppConstants.TOAST.INFO);
          }
     }

     selectCredentialFromList(cred: CredentialItem) {
          this.credentialUtilService.selectCredentialFromList(cred, this.activeTab(), this.currentWallet().address);

          if (this.activeTab() !== 'create') this.infoPanelExpanded.set(false);
          // document.querySelector('.form-group')?.scrollIntoView({ behavior: 'smooth' });
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.txUiService.credentialIdSearchQuery.set(value);
     }
}
