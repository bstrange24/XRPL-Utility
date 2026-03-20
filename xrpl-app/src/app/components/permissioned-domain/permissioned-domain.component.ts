import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { RequirementsInfoComponent } from './ui-components/requirements-info/requirements-info.component';
import { PermissionedDomainUtilService } from '../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../services/toast/toast.service';
import { PermissionedDomainOrchestratorService } from '../../services/permissioned-domain/permissioned-domain-orchestrator/permissioned-domain-orchestrator.service';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { CredentialViewModelService } from '../../services/credentials/credential-view-model/credential-view-model.service';
import { PermissionedDomainViewModelService } from '../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
import { PermissionedDomainStoreService } from '../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { PermissionedDomainsSummaryComponent } from './ui-components/summary/permissioned-domains-summary.component';
import { PERMISSION_DOMAIN_TAB_META, PERMISSION_DOMAIN_TABS } from './constants/permissioned-domain.ui';
import { PermissionDomainConfig } from './constants/permissioned-domain.types';
import { PermissionDomainDeleteFormComponent } from './tab/permission-domain-delete-form/permission-domain-delete-form.component';
import { PermissionDomainSetFormComponent } from './tab/permission-domain-set-form/permission-domain-set-form.component';
import { PERMISSION_DOMAIN_TAB, PermissionDomainActionTypes } from './constants/permissioned-domain.constants';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { ConnectionGuardService } from '../../services/connection-guard/connection-guard.service';
import { ConnectionStatusComponent } from '../shared/conneciton-status/connection-status/connection-status.component';

@Component({
     selector: 'app-permissioned-domain',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, RequirementsInfoComponent, TransactionOptionsSectionComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, PermissionedDomainsSummaryComponent, PermissionDomainDeleteFormComponent, PermissionDomainSetFormComponent, ConnectionStatusComponent],
     templateUrl: './permissioned-domain.component.html',
     styleUrl: './permissioned-domain.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainComponent extends WalletDestinationBase implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainOrchestratorService = inject(PermissionedDomainOrchestratorService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialViewModelService = inject(CredentialViewModelService);
     public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly connectionGuard = inject(ConnectionGuardService);
     readonly menuTabs: TabConfig[] = PERMISSION_DOMAIN_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = PERMISSION_DOMAIN_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['deletePermissionedDomain'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getPermissionedDomainForAccount();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async setTab(tab: string): Promise<void> {
          if (PERMISSION_DOMAIN_TAB.includes(tab as any)) {
               this.permissionedDomainViewModelService.activeTab.set(tab as PermissionDomainActionTypes);
               this.destinationSearchQuery.set('');

               if (this.hasWallets()) await this.getPermissionedDomainForAccount();
          }
     }

     async getPermissionedDomainForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getPermissionedDomainForAccount', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();
               this.permissionedDomainStoreService.resetDomainDropDown();

               // if (!this.walletManagerService.ensureWalletSelected()) throw new Error('Unable to get selected wallet.');
               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.permissionedDomainUtilService.clearFields();
               } catch (error: any) {
                    console.error('Error in getPermissionedDomainForAccount:', error);
                    this.toastService.error(error.message || 'Error getting permissioned domain detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.permissionedDomainViewModelService.activeTab();
          const wallet = this.currentWallet();

          let issuerAddress: string | undefined;

          if (currentTab === 'setPermissionedDomain') {
               issuerAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!issuerAddress || !xrpl.isValidAddress(issuerAddress)) {
                    this.toastService.error('Please enter a valid issuer address.', AppConstants.TOAST.ERROR);
                    return;
               }
               this.permissionedDomainStoreService.setField('credentialIssuer', issuerAddress);
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    ...(currentTab === 'setPermissionedDomain' ? { destinationAddress: issuerAddress } : {}),
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          if (currentTab === 'deletePermissionedDomain') {
               const selectedId = this.permissionedDomainStoreService.selectedDomainId();
               if (!selectedId) {
                    this.toastService.error('No permissioned domain selected to delete.', AppConstants.TOAST.ERROR);
                    return;
               }

               const found = env.accountObjects?.result?.account_objects?.some((obj: any) => obj.LedgerEntryType === 'PermissionedDomain' && obj.index === selectedId);

               if (!found) {
                    this.toastService.error(`Permissioned domain with ID ${selectedId} not found.`, AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const permissionedDomainState = this.permissionedDomainStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: PermissionDomainConfig = {
               permissionedDomain: permissionedDomainState,
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
                         case 'setPermissionedDomain':
                              txResult = await this.permissionedDomainOrchestratorService.executePermissionDomainTx('setPermissionedDomain', config);
                              break;
                         case 'deletePermissionedDomain':
                              txResult = await this.permissionedDomainOrchestratorService.executePermissionDomainTx('deletePermissionedDomain', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unable error when submitting transaction.');

          const successFullTx: boolean = await this.handleTxResult(txResult, env.client, env.wallet, issuerAddress, this.permissionedDomainStoreService.credentialIssuer(), '');
          if (currentTab === 'deletePermissionedDomain' && successFullTx && !this.xrplTxOptionsStore.isSimulateEnabled()) {
               this.permissionedDomainStoreService.resetDomainDropDown();
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.permissionedDomainViewModelService.getCreatedPermissionedDomains(env.accountObjects, env.wallet.classicAddress);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.permissionedDomainStoreService.setField('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.permissionedDomainStoreService.setField('subject', addr);
     }

     selectPermissionedDomainFromList(domain: any) {
          this.permissionedDomainUtilService.onDomainSelected({
               id: domain.index,
               display: domain.index.slice(0, 10) + '...' + domain.index.slice(-8),
               secondary: domain.AcceptedCredentials ? `Credentials: ${domain.AcceptedCredentials.length}` : 'No credentials',
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          });

          this.infoPanelExpanded.set(false);
     }

     readonly currentInfo = computed(
          () =>
               this.permissionedDomainViewModelService.infoData() ?? {
                    actionButtonClass: '',
                    actionButtonLabel: 'Action',
               }
     );

     protected clearInputFields(): void {
          this.permissionedDomainUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
