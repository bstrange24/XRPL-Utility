import { Component, inject, OnInit, ChangeDetectionStrategy, effect, computed, signal, OnDestroy } from '@angular/core';
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
import { OfferActionTypes, OfferTxConfig } from './constants/offer.types';
import { OfferFieldsComponent } from './tab/offer-fields/offer-fields.component';
import { OfferSummaryComponent } from './ui-components/offer-summary/offer-summary.component';
import { OfferRequirementsInfoComponent } from './ui-components/offer-requirements-info/offer-requirements-info.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { OfferCurrencyService } from '../../services/offer/offer-currency/offer-currency.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-offer',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionPreviewComponent, OfferFieldsComponent],
     templateUrl: './offer.component.html',
     styleUrl: './offer.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOfferComponent extends WalletDestinationBase implements OnInit, OnDestroy {
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

     private isInitialized = false;
     private currencySyncInProgress = false;
     readonly activeTabForRequirements = computed(() => this.offerTransactionViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);

          this.txUiService.clearAllOptionsAndMessages();

          // FIXED: Use runInInjectionContext and prevent race conditions
          effect(() => {
               if (this.currencySyncInProgress) return;
               this.currencySyncInProgress = true;

               try {
                    const curr = this.offerCurrency.weWant.currency();
                    if (curr !== this.offerTransactionViewModelService.weWantCurrency()) {
                         this.offerTransactionViewModelService.weWantCurrency.set(curr);
                         this.offerStoreService.setField('weWantCurrency', curr);
                    }
               } finally {
                    this.currencySyncInProgress = false;
               }
          });

          effect(() => {
               if (this.currencySyncInProgress) return;
               this.currencySyncInProgress = true;

               try {
                    const curr = this.offerCurrency.weSpend.currency();
                    if (curr !== this.offerTransactionViewModelService.weSpendCurrency()) {
                         this.offerTransactionViewModelService.weSpendCurrency.set(curr);
                         this.offerStoreService.setField('weSpendCurrency', curr);
                    }
               } finally {
                    this.currencySyncInProgress = false;
               }
          });

          // FIXED: Debounced refresh to avoid excessive calls
          effect(() => {
               this.offerTransactionViewModelService.weWantIssuersTrigger();
               setTimeout(() => {
                    this.offerTransactionViewModelService.weWantIssuersTrigger.update(n => n + 1);
               }, 100);
          });

          effect(() => {
               this.offerTransactionViewModelService.weSpendIssuersTrigger();
               setTimeout(() => {
                    this.offerTransactionViewModelService.weSpendIssuersTrigger.update(n => n + 1);
               }, 100);
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, OFFER_TX_TYPES as any, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
          this.setRightPanel();

          // FIXED: Only load if we have wallets
          if (this.hasWallets()) {
               this.onAccountChange(true).catch(console.error);
          }

          this.isInitialized = true;
     }

     ngOnDestroy(): void {
          this.rightPanelService.clearPanel();
          this.isInitialized = false;
     }

     private readonly updateRightPanelEffect = effect(() => {
          const wallet = this.currentWallet();
          if (wallet?.address && this.isInitialized) {
               this.setRightPanel();
          }
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          if (!this.currentWallet()) return;

          this.offerCurrency.setWalletAddress(this.currentWallet()?.classicAddress || this.currentWallet()?.address);
          await this.offerCurrency.refreshBothBalances(this.currentWallet());
          this.rightPanelService.resetFilters();
          await this.onAccountChange(true);
     }

     async selectWallet(wallet: Wallet): Promise<void> {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }

          this.offerCurrency.setWalletAddress(wallet.address || wallet.classicAddress);
          this.trustlineCurrencyService.refreshCurrentBalance();

          await this.offerCurrency.refreshBothBalances(wallet);

          // FIXED: Only set XRP if no currency selected
          const currentSpendCurrency = this.offerCurrency.weSpend.currency();
          if (!currentSpendCurrency || currentSpendCurrency === '') {
               await this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
          }
     }

     async setTab(tab: string): Promise<void> {
          const allowed = Object.values(OFFER_TX_TYPES) as string[];
          if (!allowed.includes(tab)) return;

          this.offerTransactionViewModelService.activeTab.set(tab as OfferActionTypes);
          this.offerUtilsService.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();

          if (this.hasWallets() && this.isInitialized) {
               await this.onAccountChange(false);
          }
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.classicAddress) {
               console.warn('No wallet selected');
               return;
          }

          this.isSummaryLoading.set(true);

          if (!forceRefresh) {
               this.tryPrePopulateFromCache(wallet.classicAddress);
          }

          try {
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               const env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    forceRefresh,
               });

               if (!env) throw new Error('Unable to get environment.');

               this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);

               if (env.accountObjects) {
                    this.offerUtilsService.getExistingOffers(env.accountObjects, wallet.classicAddress);
               }

               this.updateSharedObjectsStore(env);

               if (this.offerTransactionViewModelService.activeTab() === 'getOrderBook') {
                    await this.offerUtilsService.fetchOrderBook(env.client, env.wallet);
               }

               // FIXED: Only update currency if needed
               this.offerCurrency.setWalletAddress(wallet.classicAddress);
               await this.offerCurrency.refreshBothBalances(wallet);

               const currentSpendCurrency = this.offerCurrency.weSpend.currency();
               if (!currentSpendCurrency || currentSpendCurrency === '') {
                    await this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
               }
          } catch (error: any) {
               console.error('Failed to load account:', error);
               this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
          } finally {
               this.isSummaryLoading.set(false);
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     async performAction(): Promise<void> {
          const currentTab = this.offerTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          if (!wallet) {
               this.toastService.error('No wallet selected', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'getOrderBook') {
               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                         includeAccountInfo: false,
                         includeAccountObject: false,
                    });
                    if (env?.client) {
                         await this.offerUtilsService.fetchOrderBook(env.client, env.wallet);
                    }
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

          try {
               txResult = await this.offerTransactionOrchestratorService.executeOfferTx(currentTab, config);
          } catch (error: any) {
               console.error(`[${currentTab}] execution failed:`, error);
               this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               return;
          }

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          if (txResult.success) {
               await this.handleTxResult(txResult, env.client, env.wallet, null, null, '');
               this.trustlineCurrencyService.refreshCurrentBalance();
               await this.offerCurrency.refreshBothBalances(wallet);
          }

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

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: OfferSummaryComponent,
               summaryInputs: {
                    info: this.offerTransactionViewModelService.infoData(),
                    tab: this.offerTransactionViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },

               mainComponent: OfferRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },
          });
     }

     async onWeWantCurrencySelected(item: SelectItem | null): Promise<void> {
          const currency = item?.id || 'XRP';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeWantCurrency(currency, wallet);

          // Force immediate sync to store
          const currentIssuer = this.offerCurrency.weWant.issuer();
          if (currentIssuer) {
               this.offerStoreService.setField('weWantIssuer', currentIssuer);
          }
     }

     async onWeWantIssuerSelected(item: SelectItem | null): Promise<void> {
          const issuer = item?.id || '';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeWantIssuer(issuer, wallet);
          this.offerStoreService.setField('weWantIssuer', issuer);
     }

     async onWeSpendCurrencySelected(item: SelectItem | null): Promise<void> {
          const currency = item?.id || 'XRP';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeSpendCurrency(currency, wallet);

          // Force immediate sync to store
          const currentIssuer = this.offerCurrency.weSpend.issuer();
          if (currentIssuer) {
               this.offerStoreService.setField('weSpendIssuer', currentIssuer);
          }
     }

     async onWeSpendIssuerSelected(item: SelectItem | null): Promise<void> {
          const issuer = item?.id || '';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeSpendIssuer(issuer, wallet);
          this.offerStoreService.setField('weSpendIssuer', issuer);
     }

     handleWeWantAmountChange(): void {
          this.offerUtilsService.onWeWantAmountChange();
     }

     handleWeSpendAmountChange(): void {
          this.offerUtilsService.onWeSpendAmountChange();
     }

     async invertOrder(): Promise<void> {
          // First, prevent any automatic recalculations during invert
          this.offerUtilsService.setIsUpdatingExchange(true);

          // Call invert order to swap store values
          this.offerUtilsService.invertOrder();
          const wallet = this.currentWallet();

          if (!wallet) {
               this.toastService.error('No wallet selected', AppConstants.TOAST.ERROR);
               this.offerUtilsService.setIsUpdatingExchange(false);
               return;
          }

          // Wait for the store to update
          await new Promise(resolve => setTimeout(resolve, 50));

          // Get the updated values from the store after inversion
          const newWeWantCurrency = this.offerStoreService.weWantCurrency();
          const newWeSpendCurrency = this.offerStoreService.weSpendCurrency();
          const newWeWantIssuer = this.offerStoreService.weWantIssuer();
          const newWeSpendIssuer = this.offerStoreService.weSpendIssuer();

          console.log('Invert - New currencies:', { newWeWantCurrency, newWeSpendCurrency });

          // Update ViewModel signals WITHOUT triggering issuer reloads yet
          this.offerTransactionViewModelService.weWantCurrency.set(newWeWantCurrency);
          this.offerTransactionViewModelService.weSpendCurrency.set(newWeSpendCurrency);
          this.offerTransactionViewModelService.weWantIssuer.set(newWeWantIssuer);
          this.offerTransactionViewModelService.weSpendIssuer.set(newWeSpendIssuer);

          // Wait a bit for signals to settle
          await new Promise(resolve => setTimeout(resolve, 100));

          // Now trigger issuer list refresh
          this.offerTransactionViewModelService.weWantIssuersTrigger.update(n => n + 1);
          this.offerTransactionViewModelService.weSpendIssuersTrigger.update(n => n + 1);

          // Refresh balances AFTER everything is set
          await this.offerCurrency.refreshBothBalances(wallet);

          // Allow recalculations again
          this.offerUtilsService.setIsUpdatingExchange(false);

          // Refresh order book if needed
          if (this.offerTransactionViewModelService.activeTab() === 'getOrderBook') {
               let env: any = null;
               try {
                    env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {});
                    if (!env) throw new Error('Unable to get environment.');
                    await this.offerUtilsService.fetchOrderBook(env.client, env.wallet);
               } catch (err: any) {
                    console.error('prepareTxEnvironment failed:', err);
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               }
          }
     }

     override toggleInfoPanel(): void {
          this.infoPanelExpanded.update(v => !v);
     }

     public canPerformAction = computed(() => {
          const idle = this.isIdle();
          if (!idle || !this.hasWallets()) return false;

          const tab = this.offerTransactionViewModelService.activeTab();

          switch (tab) {
               case 'createOffer':
                    return this.offerUtilsService.canCreateOffer?.() ?? false;
               case 'cancelOffer':
                    return this.offerUtilsService.canCancelOffer?.() ?? false;
               case 'getOrderBook':
                    return true;
               default:
                    return false;
          }
     });

     getButtonTooltip(): string {
          if (!this.connectionGuard.isConnectionReady()) {
               return 'Connection not ready. Please wait.';
          }

          if (!this.isIdle() || !this.hasWallets()) {
               return 'Please wait or select a wallet';
          }

          const tab = this.offerTransactionViewModelService.activeTab();

          if (!this.canPerformAction()) {
               if (tab === 'createOffer') {
                    return 'Please fill both sides (Taker Gets + Taker Pays)';
               }
               if (tab === 'cancelOffer') {
                    return 'Please select at least one offer to cancel';
               }
               return 'Cannot perform this action';
          }

          return '';
     }

     protected clearInputFields(): void {
          this.offerUtilsService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.txUiService.disableAdditionalFields();
     }
}
