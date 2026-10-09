import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { DelegateStoreService } from '../../services/delegate/delegate-store/delegate-store.service';
import { DelegateTransactionOrchestratorService } from '../../services/delegate/delegate-transaction-orchestrator/delegate-transaction-orchestrator.service';
import { DelegateTransactionViewModelService } from '../../services/delegate/delegate-transaction-view-model/delegate-transaction-view-model.service';
import { DelegateUtilService } from '../../services/delegate/delegate-util/delegate-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { DELEGATE_TAB } from './constants/delegate.constants';
import { DelegateActionTypes, DelegateTxConfig } from './constants/delegate.types';
import { DELEGATE_TAB_META, DELEGATE_TABS } from './constants/delegate.ui';
import { DelegateClearComponent } from './tab/delegate-clear/delegate-clear.component';
import { DelegateCreateComponent } from './tab/delegate-create/delegate-create.component';
import { DelegateRequirementInfoComponent } from './ui-components/delegate-requirement-info/delegate-requirement-info.component';
import { DelegateSummaryComponent } from './ui-components/delegate-summary/delegate-summary.component';

@Component({
     selector: 'app-delegate',
     standalone: true,
     imports: [CommonModule, FormsModule, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, TransactionOptionsComponent, TransactionPreviewComponent, DelegateRequirementInfoComponent, DelegateCreateComponent, DelegateClearComponent, ButtonTooltipComponent],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDelegateComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     private readonly rightPanelService = inject(RightPanelService);
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly delegateTransactionOrchestratorService = inject(DelegateTransactionOrchestratorService);
     public readonly delegateUtilService = inject(DelegateUtilService);
     public readonly delegateTransactionViewModelService = inject(DelegateTransactionViewModelService);
     public readonly delegateStore = inject(DelegateStoreService);

     readonly menuTabs: TabConfig[] = DELEGATE_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = DELEGATE_TAB_META;

     readonly canPerformAction = computed(() => {
          if (!this.connectionGuard.isConnectionReady() || !this.isIdle() || !this.hasWallets()) return false;

          if (this.delegateTransactionViewModelService.activeTab() === 'delegateCreate') {
               const selectedCount = this.delegateStore.selected().size;
               return !!this.selectedDestinationAddress() && selectedCount > 0 && selectedCount <= 10;
          }

          const selectedDestination = this.delegateStore.destination();
          return !!selectedDestination && this.delegateStore.existingDelegations().some(delegation => delegation.Authorize === selectedDestination);
     });

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // Typed or dropdown-selected destinations on the grant tab must reach the store used by the transaction builder
          effect(() => {
               const destination = this.selectedDestinationAddress();
               if (this.delegateTransactionViewModelService.activeTab() === 'delegateCreate') {
                    untracked(() => this.delegateStore.setField('destination', destination));
               }
          });

          this.setRightPanel();
     }

     ngOnDestroy(): void {
          this.rightPanelService.clearPanel();
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: DelegateSummaryComponent,
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, DELEGATE_TAB, tab => this.setTab(tab));
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.selectedDestinationAddress.set('');
          this.delegateStore.setField('destination', '');
          this.delegateStore.setField('selected', new Set<number>());
          await this.getAccountDetails(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     setDelegateDestination(destination: string): void {
          this.delegateStore.setField('destination', destination);
          if (this.delegateTransactionViewModelService.activeTab() === 'delegateCreate') {
               this.selectedDestinationAddress.set(destination);
          }
     }

     async setTab(tab: string): Promise<void> {
          if (!DELEGATE_TAB.includes(tab as DelegateActionTypes)) return;
          this.delegateTransactionViewModelService.activeTab.set(tab as DelegateActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getAccountDetails(false);
     }

     toggleSelection(id: number): void {
          const selected = new Set(this.delegateStore.selected());
          if (selected.has(id)) {
               selected.delete(id);
          } else if (selected.size < 10) {
               selected.add(id);
          }
          this.delegateStore.setField('selected', selected);
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.delegateUtilService.getExistingDelegations(env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.toastService.error(error.message || 'Failed to get delegated actions', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     getButtonTooltip(): string {
          if (!this.connectionGuard.isConnectionReady()) return 'Connection not ready. Please wait.';
          if (!this.isIdle() || !this.hasWallets()) return 'Please wait or select a wallet.';

          if (this.delegateTransactionViewModelService.activeTab() === 'delegateCreate') {
               if (!this.selectedDestinationAddress()) return 'Select or enter the delegate account address.';
               const permissionCount = this.delegateStore.selected().size;
               if (!permissionCount) return 'Select at least one permission.';
               if (permissionCount > 10) return 'A maximum of 10 permissions can be granted.';
          } else {
               const selectedDestination = this.delegateStore.destination();
               if (!selectedDestination || !this.delegateStore.existingDelegations().some(delegation => delegation.Authorize === selectedDestination)) {
                    return 'Select an active delegate to remove.';
               }
          }

          return '';
     }

     async performAction(): Promise<void> {
          if (!this.canPerformAction()) return;

          const currentTab = this.delegateTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();
          let env: any;

          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeTickets: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (error: any) {
               console.error('prepareTxEnvironment failed:', error);
               this.toastService.error(error.message || 'Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          const config: DelegateTxConfig = {
               delegate: this.delegateStore.getAll(),
               account: this.accountConfiguratorStoreService.getAll(),
               txOptions: this.xrplTxOptionsStore.getAll(),
               wallet,
               preFetchedEnv: env,
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;
          await this.withPerf('performAction', async () => {
               try {
                    txResult = await this.delegateTransactionOrchestratorService.executeDelegateTx(currentTab, config);
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, '', '', '', { includeTicketObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     clearFields(): void {
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.updateSharedObjectsStore(env);
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          this.delegateUtilService.getExistingDelegations(env.accountObjects);
     }

     protected clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.delegateStore.setField('destination', '');
          this.delegateStore.setField('selected', new Set<number>());
          this.txUiService.disableAdditionalFields();
          this.xrplTxOptionsStore.setField('selectedTicketSequences', []);
          this.xrplTxOptionsStore.setField('ticketCountField', '');
     }
}
