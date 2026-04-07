import { OnInit, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AccountConfiguratorUtilService } from '../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AccountConfiguratorOrchestratorService } from '../../services/account-configurator/account-configurator-orchestrator/account-configurator-orchestrator.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { AccountConfiguratorRequirementsInfoComponent } from './ui-components/account-configurator-requirements-info/account-configurator-requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AccountConfiguratorViewModelService } from '../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { ACCOUNT_CONFIG_ACTIONS, AccountConfigAction } from './constants/account-configurator.types';
import { AccountConfiguratorSummaryComponent } from './ui-components/summary/account-configurator-summary.component';
import { DepositAuthComponent } from './ui-components/tabs/deposit-auth/deposit-auth.component';
import { AccountFlagsComponent } from './ui-components/tabs/flags/account-flags.component';
import { AccountMetadataComponent } from './ui-components/tabs/meta-data/account-metadata.component';
import { MultiSignComponent } from './ui-components/tabs/multi-sgn/multi-sign.component';
import { RegularKeyComponent } from './ui-components/tabs/regular-key/regular-key.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { animation, toastAnimation } from '../../services/utils/animations/animations.service';

@Component({
     selector: 'app-account-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, TransactionPreviewComponent, AccountConfiguratorRequirementsInfoComponent, RouterModule, ExecutionTimeDisplayComponent, WarningMessageComponent, TabMenuWithInfoComponent, AccountConfiguratorSummaryComponent, DepositAuthComponent, AccountFlagsComponent, AccountMetadataComponent, MultiSignComponent, RegularKeyComponent],
     animations: [animation, toastAnimation],
     templateUrl: './account-configurator.component.html',
     styleUrl: './account-configurator.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly accoutDataService = inject(AcccountDataService);
     public readonly accountConfiguratorOrchestratorService = inject(AccountConfiguratorOrchestratorService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['modifyAccountFlags', 'modifyDepositAuth', 'modifyMetaData', 'modifyMultiSigners', 'modifyRegularKey'] as const, tab => this.setTab(tab));
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: string): Promise<void> {
          const isValidTab = (t: string): t is AccountConfigAction => Object.values(ACCOUNT_CONFIG_ACTIONS).includes(t as AccountConfigAction);
          if (isValidTab(tab)) {
               this.accountConfiguratorViewModelService.activeTab.set(tab);
               if (this.hasWallets()) await this.getAccountDetails(true);
          }
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();
               this.accountConfiguratorStoreService.setField('configurationType', null);

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    const currentTab = this.accountConfiguratorViewModelService.activeTab();
                    this.accountConfiguratorStoreService.setField('accountInfo', env.accountInfo);

                    this.accountConfiguratorUtilService.setAccountFlags(currentTab, env);

                    this.refreshAccountObject(env);
                    if (currentTab === 'modifyMultiSigners') this.accountConfiguratorStoreService.setField('signerQuorum', 1);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(enabled: string): Promise<void> {
          const currentTab = this.accountConfiguratorViewModelService.activeTab();
          this.txUiService.clearAllOptionsAndMessages();
          const wallet = this.currentWallet();

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: any = {
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          const handler = this.accountConfiguratorUtilService.actionHandlers[currentTab];
          if (!handler) {
               this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
               return;
          }

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;
          await this.withPerf('performAction', async () => {
               try {
                    txResult = await handler(config, enabled);
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          this.isAccountConfig.set(true);
          const successFullTx = await this.handleTxResult(txResult, env.client, env.wallet, '', '', '');
          if (successFullTx && !this.xrplTxOptionsStore.isSimulateEnabled()) {
               env = await this.txEnvironmentService.getValidatedEnvironment(true);
               this.accountConfiguratorUtilService.handlePostSuccess(currentTab, config, env);
               this.refreshAccountObject(env);
               this.accoutDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          }
          this.isAccountConfig.set(false);

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.accountConfiguratorViewModelService.accountInfo.set(env.accountInfo);
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          this.acccountDataService.refreshUiStateAccountConfigure(env.wallet, env);
     }

     protected clearInputFields(): void {
          this.accountConfiguratorStoreService.resetAll();
     }
}
