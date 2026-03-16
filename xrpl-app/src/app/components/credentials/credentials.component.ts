import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { CredentialViewModelService } from '../../services/credentials/credential-view-model/credential-view-model.service';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { RequirementsInfoComponent } from './ui-components/credential-requirements-info/requirements-info.component';
import { CredentialsSummaryComponent } from './ui-components/summary/credentials-summary.component';
import { CredentialDeleteComponent } from './tab/credential-delete/credential-delete.component';
import { CredentialVerifyComponent } from './tab/credential-verify/credential-verify.component';
import { CredentialCreateComponent } from './tab/credential-create/credential-create.component';
import { CredentialAcceptComponent } from './tab/credential-accept/credential-accept.component';
import { CREDENTIAL_TAB_META, CREDENTIAL_TABS } from './constants/credential.ui';
import { CredentialActionTypes, CredentialItemVm, CredentialTxConfig } from './constants/credential.types';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, RequirementsInfoComponent, TransactionOptionsSectionComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, CredentialsSummaryComponent, CredentialDeleteComponent, CredentialVerifyComponent, CredentialCreateComponent, CredentialAcceptComponent],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly validationService = inject(ValidationService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     private readonly credentialTransactionOrchestratorService = inject(CredentialTransactionOrchestratorService);
     public readonly transactionUiService = inject(TransactionUiService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialViewModelService = inject(CredentialViewModelService);
     readonly menuTabs: TabConfig[] = CREDENTIAL_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = CREDENTIAL_TAB_META;

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

     canSelectCredential(cred: any): boolean {
          const walletVm = this.walletManager.walletVm();
          const tab = this.credentialViewModelService.activeTab();
          if (!walletVm.wallet) return false;
          if (tab === 'create') return false;
          if (tab === 'verify') return cred.Issuer === walletVm.wallet.address;
          return true;
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByCredentialIndex(_index: number, cred: CredentialItem) {
          return cred.index;
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['create', 'accept', 'delete', 'verify'] as const;
          if (validTabs.includes(tab as any)) {
               this.credentialViewModelService.activeTab.set(tab as CredentialActionTypes);
               this.destinationSearchQuery.set('');

               this.credentialStore.resetCredentialIdDropDown();
               this.txUiService.clearAllOptionsAndMessages();
               this.credentialStore.clearOptionalExpirationDate();

               if (this.hasWallets()) await this.getCredentialsForAccount();
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
                    this.credentialUtilService.clearInputFields();
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.toastService.error(error.message || 'Error getting credential detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.credentialViewModelService.activeTab();

          if (!this.walletManagerService.ensureWalletSelected()) return;

          const walletVm = this.walletManager.walletVm();
          if (!walletVm?.wallet) throw new Error('Unable to get selected wallet.');

          // 2. Early input resolution & basic validation
          let subjectDestination: string | undefined;
          if (currentTab === 'create') {
               this.selectedDestinationAddress.set(this.credentialStore.get('subject'));
               subjectDestination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!subjectDestination || !xrpl.isValidAddress(subjectDestination)) {
                    this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          if ((currentTab === 'accept' || currentTab === 'delete') && !this.credentialStore.get('credentialID')) {
               this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'verify') {
               await this.handleVerifyCredential();
               return;
          }

          // 3. Prepare environment once
          let envRef: any = null;
          try {
               envRef = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    ...(currentTab === 'create' ? { destinationAddress: subjectDestination } : {}),
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          const storeState = this.credentialStore.getAll();

          // 4. Build rich config object
          const config: CredentialTxConfig = {
               ...storeState,
               wallet: walletVm.wallet,
               simulate: this.txUiService.isSimulateEnabled(),
               multiSign: this.txUiService.useMultiSign(),
               preFetchedEnv: envRef,
               extra: {},
          };

          // 5. Action map → execute
          const actionMap: Record<CredentialActionTypes, () => Promise<{ success: boolean; hash?: string; error?: string } | null>> = this.actionHandlers(config);

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    txResult = await actionMap[currentTab]();
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unable error when submitting transaction.');

          if (txResult) {
               const successFullTx: boolean = await this.handleTxResult(txResult, envRef.client, envRef.wallet, subjectDestination, this.credentialStore.get('credentialIssuer'), '');
               if (currentTab === 'delete' && successFullTx && !this.txUiService.isSimulateEnabled()) {
                    this.credentialStore.resetCredentialIdDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private actionHandlers(config: CredentialTxConfig): Record<CredentialActionTypes, () => Promise<{ success: boolean; hash?: string; error?: string } | null>> {
          return {
               create: () => this.credentialTransactionOrchestratorService.executeCredentialTx('createCredential', config),
               accept: () => this.credentialTransactionOrchestratorService.executeCredentialTx('acceptCredentials', config),
               delete: () => this.credentialTransactionOrchestratorService.executeCredentialTx('deleteCredentials', config),
               verify: async () => null,
          };
     }

     private async handleVerifyCredential(): Promise<boolean> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({ includeAccountInfo: true, includeLedgerInfo: true });
          const { accountInfo, client, ledgerInfo } = env;
          const walletVm = this.walletManager.walletVm();

          const inputs = this.txUiService.getValidationInputs({
               wallet: walletVm.wallet!,
               network: { accountInfo },
               credentials: { credentialId: this.credentialStore.get('credentialID'), credentialType: this.credentialStore.get('credentialType') },
          });

          const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });
          if (errors.length > 0) {
               this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
               return false;
          }

          const selected = this.credentialStore.get('selectedCredentials');
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
          this.credentialStore.set('existingCredentials', this.credentialUtilService.parseIssuedCredentials(env.accountObjects, env.wallet.classicAddress));
          this.credentialStore.set('subjectCredentials', this.credentialUtilService.parseSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.credentialStore.set('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.credentialStore.set('subject', addr);
     }

     onCredentialSelected(cred: CredentialItemVm) {
          this.selectCredential(cred, 'list');
     }

     selectCredential(item: SelectItem | CredentialItem | null, source: 'dropdown' | 'list' = 'list') {
          const activeTab = this.credentialViewModelService.activeTab();
          const walletAddress = this.walletManager.walletVm()?.address;

          this.credentialUtilService.selectCredential(item, activeTab, walletAddress, source);

          // Only UI-specific behavior stays here
          if (source === 'list' && activeTab !== 'create') {
               this.infoPanelExpanded.set(false);
          }
     }

     protected clearInputFields(): void {
          this.credentialUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
