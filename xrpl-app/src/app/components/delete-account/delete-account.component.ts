import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { AppConstants, TabMetaInfo } from '../../core/app.constants';
import * as xrpl from 'xrpl';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { DeleteAccountOrchestratorService } from '../../services/delete-account/delete-account-orchestrator/delete-account-orchestrator.service';
import { DeleteAccountUtilService } from '../../services/delete-account/delete-account-util/delete-account-util.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { DeleteAccountViewModelService } from '../../services/delete-account/delete-account-view-model/delete-account-view-model.service';
import { DeleteAccountStoreService } from '../../services/delete-account/delete-account-store/delete-account-store.service';
import { XrplTxOptionsStore } from '../shared/stores/xrpl-tx-options.store';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { DeleteAccountRequirementsInfoComponent } from './ui-components/delete-account-requirements-info/delete-account-requirements-info.component';
import { DeleteAccountSummaryComponent } from './ui-components/summary/delete-account-summary.component';
import { DeleteAccountFormComponent } from './tab/delete-account-form/delete-account-form.component';
import { DELETE_ACCOUNT_TAB_META } from './constants/delete-account.ui';
import { AccountDeleteConfig } from './constants/delete-account.types';

@Component({
     selector: 'app-delete-account',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, DeleteAccountRequirementsInfoComponent, RouterModule, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, DeleteAccountSummaryComponent, DeleteAccountFormComponent],
     templateUrl: './delete-account.component.html',
     styleUrl: './delete-account.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountComponent extends WalletDestinationBase implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly deleteAccountOrchestratorService = inject(DeleteAccountOrchestratorService);
     public readonly deleteAccountUtilService = inject(DeleteAccountUtilService);
     public readonly deleteAccountViewModelService = inject(DeleteAccountViewModelService);
     public readonly deleteAccountStoreService = inject(DeleteAccountStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     readonly tabMeta: Record<string, TabMetaInfo> = DELETE_ACCOUNT_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['deleteAccount'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['deleteAccount'] as const;
          if (validTabs.includes(tab as any)) {
               this.deleteAccountViewModelService.activeTab.set(tab as 'deleteAccount');
               this.destinationSearchQuery.set('');

               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets()) await this.getAccountDetails(true);
          }
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeServerInfo: true,
                         includeBlockingObjects: true,
                         forceRefresh: forceRefresh,
                    });

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getting account details:', error);
                    this.toastService.error(error.message || 'Error getting account detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteAccount(): Promise<void> {
          // 1. Guards & resets
          this.deleteAccountStoreService.set('savedTxJson', []);
          this.deleteAccountStoreService.set('savedTxResult', []);

          if (!this.walletManagerService.ensureWalletSelected()) return;

          const walletVm = this.walletManager.walletVm();
          if (!walletVm?.wallet) return;

          // 2. Early destination resolution + basic guard
          const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          if (!destination || !xrpl.isValidAddress(destination)) {
               this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
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
                    includeServerInfo: true,
                    includeBlockingObjects: true,
                    destinationAddress: destination,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          // 4. Build rich config
          const config: AccountDeleteConfig = {
               wallet: walletVm.wallet,
               simulate: this.txUiService.isSimulateEnabled(),
               multiSign: this.txUiService.useMultiSign(),
               preFetchedEnv: envRef,
               destination,
               destinationTag: this.xrplTxOptionsStore.destinationTag(),
               extra: {},
          };

          // 5. Execute via orchestrator
          let txResult: { success: boolean; hash?: string; error?: string; validationError?: boolean } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    txResult = await this.deleteAccountOrchestratorService.executeDeleteAccountTx('deleteAccount', config);
               } catch (err: any) {
                    console.error('[deleteAccount] execution failed:', err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) return;

          // 6. Handle result + side effects
          if (txResult) {
               this.isAccountDelete.set(true);
               const successFullTx: boolean = await this.handleTxResult(txResult, envRef.client, envRef.wallet, destination, '', '');
               if (successFullTx && !this.txUiService.isSimulateEnabled()) {
                    this.deleteWalletAfterDeleteTx(this.walletManagerService.getSelectedIndex());
                    this.refreshAfterTx(envRef.client, envRef.wallet, destination, '');
               }
               this.isAccountDelete.set(false);
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.deleteAccountStoreService.set('accountInfo', env.accountInfo);
          this.deleteAccountStoreService.set('accountObjects', env.accountObjects);
          this.deleteAccountStoreService.set('serverInfo', env.serverInfo);
          this.deleteAccountStoreService.set('blockingObjects', env.blockingObjects);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     deleteWalletAfterDeleteTx(index: number) {
          this.deleteAccountStoreService.set('savedTxJson', this.txUiService.txResultSignal());
          this.deleteAccountStoreService.set('savedTxResult', this.txUiService.txResultSignal());
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
