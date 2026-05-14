import { Component, OnInit, inject, ChangeDetectionStrategy, OnDestroy, effect, ViewChild, output, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import * as xrpl from 'xrpl';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { SendXrpRequirementsInfoComponent } from './ui-components/send-xrp-requirements-info/send-xrp-requirements-info.component';
import { SendXrpFormComponent } from './tab/send-xrp-form/send-xrp-form.component';
import { ActivatedRoute } from '@angular/router';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { SendXrpViewModelService } from '../../services/send-xrp/send-xrp-view-model/send-xrp-view-model.service';
import { SendXrpUtilService } from '../../services/send-xrp/send-xrp-util/send-xrp-util.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { SendXrpActionTypes, XrpPaymentConfig } from './constants/send-xrp.types';
import { SEND_XRP_TAB_META, SEND_XRP_TABS } from './constants/send-xrp.ui';
import { SEND_XRP_TAB } from './constants/send-xrp.constants';
import { SendXrpSummaryComponent } from './ui-components/send-xrp-summary/send-xrp-summary.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
     selector: 'app-send-xrp',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, TransactionOptionsComponent, SendXrpFormComponent, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, MatSlideToggleModule],
     templateUrl: './send-xrp.component.html',
     styleUrl: './send-xrp.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly sendXrpTransactionOrchestratorService = inject(SendXrpTransactionOrchestratorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly sendXrpViewModelService = inject(SendXrpViewModelService);
     public readonly sendXrpUtilService = inject(SendXrpUtilService);
     private readonly rightPanelService = inject(RightPanelService);
     public canSendXrpFromForm = signal<boolean>(false);
     public readonly sendXrpTabs = SEND_XRP_TABS;
     public readonly tabMeta = SEND_XRP_TAB_META;
     lastIntendedDestination = signal<string>('');
     resetTrigger = input<number>(0);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // Track intended destination for warning message
          effect(() => {
               const currentSelected = this.selectedDestinationAddress();
               if (currentSelected) {
                    this.lastIntendedDestination.set(currentSelected);
               }
          });

          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               // this.clearSearch();
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, SEND_XRP_TAB, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
          this.txUiService.wantsOptions.set(false);

          // Initial setup
          this.setRightPanel();
     }

     ngOnDestroy(): void {
          this.rightPanelService.clearPanel();
     }

     private readonly updateRightPanelEffect = effect(() => {
          const wallet = this.currentWallet();
          if (wallet?.address) {
               this.setRightPanel();
          }
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.rightPanelService.resetFilters();
          await this.onAccountChange();
     }

     async setTab(tab: string): Promise<void> {
          if (!SEND_XRP_TABS.includes(tab as any)) return;
          this.sendXrpViewModelService.activeTab.set(tab as SendXrpActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.onAccountChange(true);
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          const address = this.walletManager.getSelectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);
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
                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.sendXrpUtilService.clearInputFields();
               } catch (error: any) {
                    console.error('Error getting account detail: ', error);
                    this.toastService.error(error.message || 'Error getting account detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
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
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

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

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, destination, this.credentialStore.credentialIssuer(), '');

          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(_env: any): Promise<void> {
          return;
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: SendXrpSummaryComponent,
               summaryInputs: {
                    info: this.sendXrpViewModelService.infoData(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },

               mainComponent: SendXrpRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.sendXrpViewModelService.activeTab,
               },
          });
     }

     handleCanSendXrpChange(canSend: boolean) {
          this.canSendXrpFromForm.set(canSend);
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
