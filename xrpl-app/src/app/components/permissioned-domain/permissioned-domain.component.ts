import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
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
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
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
import { PERMISSION_DOMAIN_TAB_META, PERMISSION_DOMAIN_TABS, PermissionDomainConfig, PermissionDomainTxType } from './constants/permissioned-domain.constants';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { PermissionedDomainsSummaryComponent } from './ui-components/summary/permissioned-domains-summary.component';

@Component({
     selector: 'app-permissioned-domain',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent, RequirementsInfoComponent, TransactionOptionsSectionComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, PermissionedDomainsSummaryComponent],
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
     readonly menuTabs: TabConfig[] = PERMISSION_DOMAIN_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = PERMISSION_DOMAIN_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['delete'] as const, tab => this.setTab(tab));
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
          const validTabs = ['set', 'delete'] as const;
          if (validTabs.includes(tab as any)) {
               this.permissionedDomainViewModelService.activeTab.set(tab as 'set' | 'delete');
               this.destinationSearchQuery.set('');

               this.permissionedDomainStoreService.resetDomainDropDown();
               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets()) await this.getPermissionedDomainForAccount();
          }
     }

     async getPermissionedDomainForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getPermissionedDomainForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

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
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null;
          let credentialIssuer: string | null = null;

          // 1. Common reset & guard clauses
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.walletManagerService.ensureWalletSelected()) return;

          // 2. Early credentialIssuer resolution
          this.selectedDestinationAddress.set(this.permissionedDomainStoreService.get('subject'));
          credentialIssuer = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          const walletVm = this.walletManager.walletVm();

          // 3. Map tab → action type
          let action: PermissionDomainTxType | 'set';
          switch (currentTab) {
               case 'set':
                    action = 'set';
                    this.permissionedDomainStoreService.set('credentialIssuer', credentialIssuer);
                    break;
               case 'delete':
                    action = 'delete';
                    break;
               default:
                    this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                    return;
          }

          // Early validation / guard
          if (currentTab === 'set') {
               if (!credentialIssuer || !xrpl.isValidAddress(credentialIssuer)) {
                    this.toastService.error('Please enter a valid issuer address.', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          await this.withPerf('performAction', async () => {
               try {
                    envRef = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         ...(currentTab === 'set' ? { destinationAddress: credentialIssuer } : {}),
                    });

                    if (currentTab === 'delete') {
                         const permissionDomainFound = envRef.accountObjects.result.account_objects.find((line: any) => {
                              return line.LedgerEntryType === 'PermissionedDomain' && line.index === this.permissionedDomainStoreService.get('selectedDomainId');
                         });

                         // If not found, exit early
                         if (!permissionDomainFound) {
                              this.toastService.error(`No Permission Domain found for ${envRef.wallet.classicAddress} with ID ${this.permissionedDomainStoreService.get('selectedDomainId')}`, AppConstants.TOAST.ERROR);
                              return;
                         }
                    }
               } catch (err: any) {
                    console.error(err);
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    return;
               }

               // 5. Build the orchestrator config
               const config: PermissionDomainConfig = {
                    wallet: walletVm.wallet!,
                    simulate: this.txUiService.isSimulateEnabled(),
                    multiSign: this.txUiService.useMultiSign(),
                    credentialType: this.permissionedDomainStoreService.get('credentialType'),
                    credentialIssuer: this.permissionedDomainStoreService.get('credentialIssuer'),
                    domainId: this.permissionedDomainStoreService.get('selectedDomainId'),
                    preFetchedEnv: envRef,
               };

               // 6. Execute
               try {
                    txResult = await this.permissionedDomainOrchestratorService.executePermissionDomainTx(action as PermissionDomainTxType, config);
               } catch (err: any) {
                    console.error(`Error in ${action}:`, err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });

          // 7. Handle result & side effects
          if (txResult) {
               const successFullTx: boolean = await this.handleTxResult(txResult, envRef.client, envRef.wallet, credentialIssuer, this.permissionedDomainStoreService.get('credentialIssuer'), '');
               if (currentTab === 'delete' && successFullTx && !this.txUiService.isSimulateEnabled()) {
                    this.permissionedDomainStoreService.resetDomainDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.permissionedDomainUtilService.getCreatedPermissionedDomains(env.accountObjects, env.wallet.classicAddress);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.permissionedDomainStoreService.set('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.permissionedDomainStoreService.set('subject', addr);
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

     protected clearInputFields(): void {
          this.permissionedDomainUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
