import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import * as xrpl from 'xrpl';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { SendXrpRequirementsInfoComponent } from './ui-components/send-xrp-requirements-info/send-xrp-requirements-info.component';
import { SendXrpFormComponent } from './tab/send-xrp-form/send-xrp-form.component';
import { ActivatedRoute } from '@angular/router';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { SendXrpViewModelService } from '../../services/send-xrp/send-xrp-view-model/send-xrp-view-model.service';
import { SendXrpUtilService } from '../../services/send-xrp/send-xrp-util/send-xrp-util.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { SendXrpActionTypes, XrpPaymentConfig } from './constants/send-xrp.types';
import { SEND_XRP_TAB_META, SEND_XRP_TABS } from './constants/send-xrp.ui';
import { SEND_XRP_TAB } from './constants/send-xrp.constants';
import { SendXrpSummaryComponent } from './ui-components/summary/send-xrp-summary.component';

@Component({
     selector: 'app-send-xrp',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SendXrpRequirementsInfoComponent, SendXrpFormComponent, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, SendXrpRequirementsInfoComponent, SendXrpSummaryComponent],
     templateUrl: './send-xrp.component.html',
     styleUrl: './send-xrp.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly sendXrpTransactionOrchestratorService = inject(SendXrpTransactionOrchestratorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly sendXrpViewModelService = inject(SendXrpViewModelService);
     public readonly sendXrpUtilService = inject(SendXrpUtilService);
     readonly menuTabs: TabConfig[] = SEND_XRP_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = SEND_XRP_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, SEND_XRP_TAB, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          // this.trustlineCurrencyService.setPreferXrpAsDefault(false);
          // this.trustlineCurrencyService.setAddMptInDropdown(false);
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.onAccountChange();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async setTab(tab: string): Promise<void> {
          if (SEND_XRP_TABS.includes(tab as any)) {
               this.sendXrpViewModelService.activeTab.set(tab as SendXrpActionTypes);
               this.destinationSearchQuery.set('');

               if (this.hasWallets()) await this.onAccountChange(true);
          }
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          await this.measure('onAccountChange', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.sendXrpUtilService.clearInputFields();
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.sendXrpViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          if (!destination || !xrpl.isValidAddress(destination)) {
               this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
               return;
          }
          this.accountConfiguratorStoreService.setField('destination', destination);

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    destinationAddress: destination,
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

          const config: XrpPaymentConfig = {
               credentialState: credentialState,
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    txResult = await this.sendXrpTransactionOrchestratorService.executeXrpPayment('sendXrp', config);
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unable error when submitting transaction.');
          await this.handleTxResult(txResult, env.client, env.wallet, destination, this.credentialStore.credentialIssuer(), '');

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(_env: any): void {
          return;
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     protected clearInputFields(): void {
          this.sendXrpUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.credentialStore.setField('credentialIDs', []);
     }
}
