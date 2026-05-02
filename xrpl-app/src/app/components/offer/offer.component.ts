import { Component, inject, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { OfferStoreService } from '../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { OfferTransactionOrchestratorService } from '../../services/offer/offer-transaction-orchestrator/offer-transaction-orchestrator.service';
import { OfferUtilsService } from '../../services/offer/offer-utils/offer-utils.service';
import { OFFER_TABS, OFFER_TAB_META } from './constants/offer.ui';
import { OFFER_TX_TYPES } from './constants/offer.constants';
import { OfferActionTypes, OfferTxConfig, OfferTxType } from './constants/offer.types';
import { OfferFieldsComponent } from './tab/offer-fields/offer-fields.component';
import { OfferSummaryComponent } from './ui-components/offer-summary/offer-summary.component';
import { OfferRequirementsInfoComponent } from './ui-components/offer-requirements-info/offer-requirements-info.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { OfferCurrencyService } from '../../services/offer/offer-currency/offer-currency.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';

@Component({
     selector: 'app-offer',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionPreviewComponent, OfferFieldsComponent, OfferSummaryComponent],
     templateUrl: './offer.component.html',
     styleUrl: './offer.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOfferComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly offerTransactionViewModelService = inject(OfferTransactionViewModelService);
     public readonly accountConfiguratorStore = inject(AccountConfiguratorStoreService);
     public readonly offerTransactionOrchestratorService = inject(OfferTransactionOrchestratorService);
     public readonly offerUtilsService = inject(OfferUtilsService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly tabs = OFFER_TABS;
     public readonly tabMeta = OFFER_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);

          this.txUiService.clearAllOptionsAndMessages();

          // Currency → Store + VM
          effect(() => {
               const curr = this.offerCurrency.weWant.currency();
               this.offerTransactionViewModelService.weWantCurrency.set(curr);
               this.offerStoreService.setField('weWantCurrency', curr);
          });

          effect(() => {
               const curr = this.offerCurrency.weSpend.currency();
               this.offerTransactionViewModelService.weSpendCurrency.set(curr);
               this.offerStoreService.setField('weSpendCurrency', curr);
          });

          // Only refresh dropdown lists
          effect(() => {
               this.offerTransactionViewModelService.weWantIssuersTrigger.update(n => n + 1);
          });

          effect(() => {
               this.offerTransactionViewModelService.weSpendIssuersTrigger.update(n => n + 1);
          });

          this.rightPanelService.setPanel(OfferRequirementsInfoComponent, {
               activeTab: this.offerTransactionViewModelService.activeTab,
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, OFFER_TX_TYPES as any, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.offerCurrency.setWalletAddress(this.currentWallet()?.classicAddress);
          await this.offerCurrency.refreshBothBalances(this.currentWallet());
          await this.onAccountChange(true);
     }

     async selectWallet(wallet: Wallet): Promise<void> {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.offerCurrency.setWalletAddress(wallet.address);
          this.trustlineCurrencyService.refreshCurrentBalance();

          // Smart default: set XRP on "What You Give" side only when wallet is ready
          await this.offerCurrency.refreshBothBalances(wallet);
          if (!this.offerCurrency.weSpend.currency()) {
               await this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
          }
     }

     async selectWallet1(wallet: Wallet): Promise<void> {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.offerCurrency.setWalletAddress(wallet.address);
          this.trustlineCurrencyService.refreshCurrentBalance();
          await this.offerCurrency.refreshBothBalances(wallet);
     }

     async setTab(tab: string): Promise<void> {
          const allowed = Object.values(OFFER_TX_TYPES) as string[];
          if (!allowed.includes(tab)) return;
          this.offerTransactionViewModelService.activeTab.set(tab as OfferActionTypes);
          this.offerUtilsService.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();

          if (this.hasWallets()) await this.onAccountChange(false);
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          const address = this.walletManagerService.getSelectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);

          await this.measure('onAccountChange', true, async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               if (!this.walletManagerService.ensureWalletSelected()) return;
               const wallet = this.walletManagerService.getSelectedWallet();

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet!, {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh,
                    });

                    if (!env) throw new Error('Unable to get environment.');

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    if (env.accountObjects) this.offerUtilsService.getExistingOffers(env.accountObjects, env.wallet.classicAddress);
                    this.updateSharedObjectsStore(env);

                    if (this.offerTransactionViewModelService.activeTab() === 'getOrderBook') {
                         await this.offerUtilsService.fetchOrderBook(env.client, env.wallet);
                    }

                    // Force wallet address + smart XRP default after account loads
                    this.offerCurrency.setWalletAddress(this.currentWallet()?.classicAddress ?? '');
                    await this.offerCurrency.refreshBothBalances(wallet);
                    if (!this.offerCurrency.weSpend.currency()) {
                         await this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
                    }
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.offerTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          if (currentTab === 'getOrderBook') {
               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                         includeAccountInfo: false,
                         includeAccountObject: false,
                    });
                    await this.offerUtilsService.fetchOrderBook(env.client, env.wallet ?? (wallet as any));
               } catch (err: any) {
                    this.toastService.error(err.message || 'Failed to fetch order book', AppConstants.TOAST.ERROR);
               }
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
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          const offerState = this.offerStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: OfferTxConfig = {
               offer: offerState,
               account: accountState,
               txOptions: txOptionsState,
               wallet,
               preFetchedEnv: env,
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    txResult = await this.offerTransactionOrchestratorService.executeOfferTx(currentTab as OfferTxType, config);
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

          await this.handleTxResult(txResult, env.client, env.wallet, null, null, '');
          this.trustlineCurrencyService.refreshCurrentBalance();
          await this.offerCurrency.refreshBothBalances(wallet);
          this.txUiService.resetCurrentStepToIdle();
     }

     protected override handleCachedAccountObjects(accountObjects: any, address: string): void {
          if (accountObjects) this.offerUtilsService.getExistingOffers(accountObjects, address);
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          if (env?.accountObjects) {
               const wallet = env.wallet ?? this.walletManagerService.getSelectedWallet();
               this.offerUtilsService.getExistingOffers(env.accountObjects, wallet.classicAddress);
          }
     }

     onWeWantCurrencySelected(item: SelectItem | null): void {
          this.offerCurrency.selectWeWantCurrency(item?.id || 'XRP', this.currentWallet());
     }

     async onWeWantIssuerSelected(item: SelectItem | null): Promise<void> {
          this.offerCurrency.selectWeWantIssuer(item?.id || '', this.currentWallet());
     }

     onWeSpendCurrencySelected(item: SelectItem | null): void {
          this.offerCurrency.selectWeSpendCurrency(item?.id || 'XRP', this.currentWallet());
     }

     async onWeSpendIssuerSelected(item: SelectItem | null): Promise<void> {
          this.offerCurrency.selectWeSpendIssuer(item?.id || '', this.currentWallet());
     }

     handleWeWantAmountChange(): void {
          this.offerUtilsService.onWeWantAmountChange();
     }

     handleWeSpendAmountChange(): void {
          this.offerUtilsService.onWeSpendAmountChange();
     }

     invertOrder(): void {
          this.offerUtilsService.invertOrder();
     }

     override toggleInfoPanel(): void {
          this.infoPanelExpanded.update(v => !v);
     }

     protected clearInputFields(): void {
          this.offerUtilsService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllFields();
     }
}
