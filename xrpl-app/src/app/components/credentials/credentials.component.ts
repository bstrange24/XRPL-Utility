import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
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
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { RequirementsInfoComponent } from './ui-components/credential-requirements-info/requirements-info.component';
import { CredentialsSummaryComponent } from './ui-components/summary/credentials-summary.component';
import { CredentialDeleteComponent } from './tab/credential-delete/credential-delete.component';
import { CredentialVerifyComponent } from './tab/credential-verify/credential-verify.component';
import { CredentialCreateComponent } from './tab/credential-create/credential-create.component';
import { CredentialAcceptComponent } from './tab/credential-accept/credential-accept.component';
import { CREDENTIAL_TAB_META, CREDENTIAL_TABS } from './constants/credential.ui';
import { CredentialActionTypes, CredentialItem, CredentialItemVm, CredentialTxConfig } from './constants/credential.types';
import { CredentialTransactionOptionsComponent } from './ui-components/transaction-options/credential-transaction-options/credential-transaction-options.component';
import { CREDENTIAL_REGEX, CREDENTIAL_TAB } from './constants/credential.constants';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, RequirementsInfoComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, CredentialsSummaryComponent, CredentialDeleteComponent, CredentialVerifyComponent, CredentialCreateComponent, CredentialAcceptComponent, CredentialTransactionOptionsComponent],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     private readonly credentialTransactionOrchestratorService = inject(CredentialTransactionOrchestratorService);
     public readonly transactionUiService = inject(TransactionUiService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialViewModelService = inject(CredentialViewModelService);
     readonly menuTabs: TabConfig[] = CREDENTIAL_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = CREDENTIAL_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, CREDENTIAL_TAB, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getCredentialsForAccount(false);
     }

     canSelectCredential(cred: any): boolean {
          const wallet = this.currentWallet();
          if (!wallet) return false;

          const tab = this.credentialViewModelService.activeTab();
          if (tab === 'createCredential') return false;
          if (tab === 'verifyCredential') return cred.Issuer === wallet.address;
          return true;
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByCredentialIndex(_index: number, cred: CredentialItem) {
          return cred.index;
     }

     async setTab(tab: string): Promise<void> {
          if (!CREDENTIAL_TAB.includes(tab as any)) return;
          this.credentialViewModelService.activeTab.set(tab as CredentialActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getCredentialsForAccount();
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          const address = this.walletManager.getSelectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);
          await this.measure('getCredentialsForAccount', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();
               this.credentialStore.resetCredentailFields();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.toastService.error(error.message || 'Error getting credential detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.credentialViewModelService.activeTab();
          const wallet = this.currentWallet();

          if (currentTab === 'verifyCredential') {
               await this.handleVerifyCredential();
               return;
          }

          let subjectDestination: string | undefined;
          if (currentTab === 'createCredential') {
               if (this.credentialStore.subject()) {
                    this.selectedDestinationAddress.set(this.credentialStore.subject());
               } else {
                    this.selectedDestinationAddress.set(this.credentialStore.subject());
                    subjectDestination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
                    if (!subjectDestination || !xrpl.isValidAddress(subjectDestination)) {
                         this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
                         return;
                    }
                    this.selectedDestinationAddress.set(subjectDestination);
                    this.credentialStore.setField('subject', subjectDestination);
               }
          }

          if ((currentTab === 'acceptCredential' || currentTab === 'deleteCredential') && !this.credentialStore.credentialID()) {
               this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
               return;
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    ...(currentTab === 'createCredential' ? { destinationAddress: subjectDestination } : {}),
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          const credentialState = this.credentialStore.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: CredentialTxConfig = {
               credential: credentialState,
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createCredential':
                              txResult = await this.credentialTransactionOrchestratorService.executeCredentialTx('createCredential', config);
                              break;
                         case 'acceptCredential':
                              txResult = await this.credentialTransactionOrchestratorService.executeCredentialTx('acceptCredentials', config);
                              break;
                         case 'deleteCredential':
                              txResult = await this.credentialTransactionOrchestratorService.executeCredentialTx('deleteCredentials', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          const successFullTx: boolean = await this.handleTxResult(txResult, env.client, env.wallet, subjectDestination, this.credentialStore.credentialIssuer(), '');
          if (currentTab === 'deleteCredential' && successFullTx && !this.xrplTxOptionsStore.isSimulateEnabled()) {
               this.credentialStore.resetCredentialIdDropDown();
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private async handleVerifyCredential(): Promise<boolean> {
          if (!this.walletManagerService.ensureWalletSelected()) return false;

          const env = await this.txEnvironmentService.prepareTxEnvironment({ includeAccountInfo: true, includeLedgerInfo: true });
          const { client, ledgerInfo } = env;

          if (!this.credentialStore.credentialID() || !this.credentialStore.credentialType()) {
               this.toastService.error('Please select a credential to verify.', AppConstants.TOAST.ERROR);
               return false;
          }

          const selected = this.credentialStore.selectedCredentials();
          if (!selected) {
               this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
               return false;
          }

          // Encode credential type
          const credentialTypeHex = xrpl.convertStringToHex(selected.CredentialType ?? '').toUpperCase();

          if (credentialTypeHex.length % 2 !== 0 || !CREDENTIAL_REGEX.test(credentialTypeHex)) {
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

          this.txUiService.setTxResultSignal(ledgerEntryRequest);

          let xrplResponse;

          try {
               xrplResponse = await client.request(ledgerEntryRequest as any);
          } catch (error: any) {
               if (error.data?.error === 'entryNotFound') {
                    this.txUiService.setTxResultSignal(error.data);
                    this.toastService.error('Credential not found.', AppConstants.TOAST.ERROR);
                    return false;
               }

               this.toastService.error(`Failed to check credential: ${error.message || 'Unknown error'}`, AppConstants.TOAST.ERROR);
               return false;
          }

          this.txUiService.setTxResultSignal(xrplResponse.result);

          const credential = (xrplResponse.result as any).node;

          // Accepted check
          if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
               this.toastService.error('Credential is not accepted.', AppConstants.TOAST.ERROR);
               return false;
          }

          if (credential.Expiration) {
               if (this.xrplDateService.isExpired(credential.Expiration, ledgerInfo.currentRippleTime)) {
                    this.toastService.error('Credential is verified but has expired.', AppConstants.TOAST.ERROR);
                    return false;
               }

               const expirationISO = this.xrplDateService.rippleToISO(credential.Expiration);
          }

          // this.txUiService.setSuccess(this.txUiService.result());
          this.toastService.success(`Credential is verified.`, AppConstants.TOAST.SUCCESS, false);

          return true;
     }

     protected override handleCachedAccountObjects(accountObjects: any, address: string): void {
          this.credentialStore.setField('existingCredentials', this.credentialUtilService.parseIssuedCredentials(accountObjects, address));
          this.credentialStore.setField('subjectCredentials', this.credentialUtilService.parseSubjectCredentials(accountObjects, address));
     }

     protected refreshAccountObject(env: any): void {
          this.credentialStore.setField('existingCredentials', this.credentialUtilService.parseIssuedCredentials(env.accountObjects, env.wallet.classicAddress));
          this.credentialStore.setField('subjectCredentials', this.credentialUtilService.parseSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.credentialStore.setField('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.credentialStore.setField('subject', addr);
     }

     onCredentialSelected(cred: CredentialItemVm) {
          this.selectCredential(cred, 'list');
     }

     selectCredential(item: SelectItem | CredentialItem | null, source: 'dropdown' | 'list' = 'list') {
          const activeTab = this.credentialViewModelService.activeTab();
          const walletVm = this.walletManager.walletVm();
          const walletAddress = walletVm?.address;

          this.credentialUtilService.selectCredential(item, activeTab, walletAddress, source);

          // Only UI-specific behavior stays here
          if (source === 'list' && activeTab !== 'createCredential') {
               this.infoPanelExpanded.set(false);
          }
     }

     protected clearInputFields(): void {
          this.credentialUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
