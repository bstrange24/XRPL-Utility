import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { AppConstants } from '../../core/app.constants';
import * as xrpl from 'xrpl';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { ACCOUNT_DELETE_TAB_META, ACCOUNT_DELETE_TABS } from './constants/account-delete.ui';
import { AccountDeleteOrchestratorService } from '../../services/account-delete/account-delete-orchestrator/account-delete-orchestrator.service';
import { AccountDeleteUtilService } from '../../services/account-delete/account-delete-util/account-delete-util.service';
import { AccountDeleteViewModelService } from '../../services/account-delete/account-delete-view-model/account-delete-view-model.service';
import { AccountDeleteStoreService } from '../../services/account-delete/account-delete-store/account-delete-store.service';
import { AccountDeleteRequirementsInfoComponent } from './ui-components/account-delete-requirements-info/account-delete-requirements-info.component';
import { AccountDeleteFormComponent } from './tab/account-delete-form/account-delete-form.component';
import { AccountDeleteSummaryComponent } from './ui-components/summary/account-delete-summary.component';
import { AccountDeleteConfig } from './constants/account-delete.types';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';

@Component({
     selector: 'app-account-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, RouterModule, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, AccountDeleteFormComponent, AccountDeleteFormComponent, AccountDeleteSummaryComponent],
     templateUrl: './account-delete.component.html',
     styleUrl: './account-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly deleteAccountOrchestratorService = inject(AccountDeleteOrchestratorService);
     public readonly deleteAccountUtilService = inject(AccountDeleteUtilService);
     public readonly deleteAccountViewModelService = inject(AccountDeleteViewModelService);
     public readonly deleteAccountStoreService = inject(AccountDeleteStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly accountDeleteTabs = ACCOUNT_DELETE_TABS;
     public readonly tabMeta = ACCOUNT_DELETE_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['deleteAccount'] as const, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();

          this.rightPanelService.setPanel(AccountDeleteRequirementsInfoComponent, {
               activeTab: this.deleteAccountViewModelService.activeTab,
          });
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['deleteAccount'] as const;
          if (!validTabs.includes(tab as any)) return;
          this.deleteAccountViewModelService.activeTab.set(tab as 'deleteAccount');
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) await this.getAccountDetails(true);
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getAccountDetails', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeServerInfo: true,
                         includeBlockingObjects: true,
                         forceRefresh: forceRefresh,
                    });
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getting account details:', error);
                    this.toastService.error(error.message || 'Error getting account detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteAccount(): Promise<void> {
          this.deleteAccountStoreService.setField('savedTxJson', []);
          this.deleteAccountStoreService.setField('savedTxResult', []);

          const wallet = this.currentWallet();

          const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          if (!destination || !xrpl.isValidAddress(destination)) {
               this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
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
                    includeBlockingObjects: true,
                    destinationAddress: destination,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          this.deleteAccountStoreService.setField('destination', destination);
          const accountDeleteState = this.deleteAccountStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: AccountDeleteConfig = {
               accountDelete: accountDeleteState,
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('deleteAccount', async () => {
               try {
                    txResult = await this.deleteAccountOrchestratorService.executeDeleteAccountTx('deleteAccount', config);
               } catch (error: any) {
                    console.error('[deleteAccount] execution failed:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }

               if (!txResult) return;

               if (txResult) {
                    this.isAccountDelete.set(true);
                    const successFullTx: boolean = await this.handleTxResult(txResult, env.client, env.wallet, destination, '', '');
                    if (successFullTx && !this.xrplTxOptionsStore.isSimulateEnabled()) {
                         this.deleteWalletAfterDeleteTx(this.walletManagerService.getSelectedIndex());
                         this.refreshAfterTx(env.client, env.wallet, destination, '');
                    }
                    this.isAccountDelete.set(false);
               }
          });

          this.txUiService.wantsOptions.set(false);
          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.deleteAccountStoreService.setField('accountInfo', env.accountInfo);
          this.deleteAccountStoreService.setField('accountObjects', env.accountObjects);
          this.deleteAccountStoreService.setField('serverInfo', env.serverInfo);
          this.deleteAccountStoreService.setField('blockingObjects', env.blockingObjects);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     deleteWalletAfterDeleteTx(index: number) {
          this.deleteAccountStoreService.setField('savedTxJson', this.txUiService.txResultSignal());
          this.deleteAccountStoreService.setField('savedTxResult', this.txUiService.txResultSignal());
          this.walletManagerService.deleteWallet(index);
          if (this.walletManagerService.getSelectedIndex() >= this.wallets().length) {
               this.walletManagerService.getSelectedIndex();
               this.walletManagerService.setSelectedIndex(Math.max(0, this.wallets().length - 1));
               const wallet = this.wallets()[this.walletManagerService.getSelectedIndex()];
               this.currentWallet.set(wallet ? { ...wallet } : ({} as Wallet));
          }
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
