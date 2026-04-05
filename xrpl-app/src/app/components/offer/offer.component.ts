import { Component, inject, OnInit, ChangeDetectionStrategy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { OfferCurrencyService } from '../../services/offer-currency/offer-currency.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
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

@Component({
     selector: 'app-offer',
     standalone: true,
     imports: [
          CommonModule,
          FormsModule,
          LucideAngularModule,
          OverlayModule,
          NavbarComponent,
          WalletPanelComponent,
          TransactionOptionsComponent,
          ExecutionTimeDisplayComponent,
          TabMenuWithInfoComponent,
          WarningMessageComponent,
          TransactionPreviewComponent,
          OfferFieldsComponent,
          OfferSummaryComponent,
          OfferRequirementsInfoComponent,
     ],
     templateUrl: './offer.component.html',
     styleUrl: './offer.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOfferComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly offerTransactionViewModelService = inject(OfferTransactionViewModelService);
     public readonly accountConfiguratorStore = inject(AccountConfiguratorStoreService);
     public readonly offerTransactionOrchestratorService = inject(OfferTransactionOrchestratorService);
     public readonly offerUtilsService = inject(OfferUtilsService);

     readonly menuTabs: TabConfig[] = OFFER_TABS as unknown as TabConfig[];
     readonly tabMeta: Record<string, TabMetaInfo> = OFFER_TAB_META;
     

     constructor(
          walletManager: WalletManagerService,
          transactionUiService: TransactionUiService,
          transactionDropdownService: TransactionDropdownService,
          walletDataService: WalletDataService,
          txEnvironmentService: TxEnvironmentService,
          copyUtilService: CopyUtilService,
          toastService: ToastService,
          acccountDataService: AcccountDataService,
          route: ActivatedRoute,
          storageService: StorageService,
     ) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.txUiService.clearAllOptionsAndMessages();

          effect(() => {
               const currency = this.offerCurrency.weWant.currency();
               this.offerTransactionViewModelService.weWantCurrency.set(currency);
               this.offerStoreService.setField('weWantCurrency', currency);
          });

          effect(() => {
               const issuer = this.offerCurrency.weWant.issuer();
               this.offerTransactionViewModelService.weWantIssuer.set(issuer);
               this.offerStoreService.setField('weWantIssuer', issuer);
          });

          effect(() => {
               const issuers = this.offerCurrency.weWant.issuers();
               this.offerTransactionViewModelService.weWantIssuersTrigger.update(n => n + 1);
               if (issuers.length > 0 && !this.offerCurrency.weWant.issuer()) {
                    this.offerCurrency.selectWeWantIssuer(issuers[0].address, this.currentWallet());
               }
          });

          effect(() => {
               const currency = this.offerCurrency.weSpend.currency();
               this.offerTransactionViewModelService.weSpendCurrency.set(currency);
               this.offerStoreService.setField('weSpendCurrency', currency);
          });

          effect(() => {
               const issuer = this.offerCurrency.weSpend.issuer();
               this.offerTransactionViewModelService.weSpendIssuer.set(issuer);
               this.offerStoreService.setField('weSpendIssuer', issuer);
          });

          effect(() => {
               const issuers = this.offerCurrency.weSpend.issuers();
               this.offerTransactionViewModelService.weSpendIssuersTrigger.update(n => n + 1);
               if (issuers.length > 0 && !this.offerCurrency.weSpend.issuer()) {
                    this.offerCurrency.selectWeSpendIssuer(issuers[0].address, this.currentWallet());
               }
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, OFFER_TX_TYPES as any, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
          this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet());
          this.offerCurrency.selectWeSpendIssuer('', this.currentWallet());
          this.txUiService.clearAllOptions();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.onAccountChange(true);
     }

     async selectWallet(wallet: Wallet): Promise<void> {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.offerCurrency.setWalletAddress(wallet.address);
          await this.offerCurrency.refreshBothBalances(wallet);
     }

     async setTab(tab: string): Promise<void> {
          const allowed = Object.values(OFFER_TX_TYPES) as string[];
          if (allowed.includes(tab)) {
               this.offerTransactionViewModelService.activeTab.set(tab as OfferActionTypes);
               this.offerUtilsService.clearInputFields();
               this.txUiService.clearAllOptionsAndMessages();
               if (this.hasWallets()) await this.onAccountChange(false);
          }
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
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

                    if (this.offerTransactionViewModelService.activeTab() === 'getOrderBook') {
                         await this.offerUtilsService.fetchOrderBook(env.client, env.wallet);
                    }
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
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
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

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

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, null, null, '');
          await this.offerCurrency.refreshBothBalances(wallet);
          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          if (env?.accountObjects) {
               const wallet = env.wallet ?? this.walletManagerService.getSelectedWallet();
               this.offerUtilsService.getExistingOffers(env.accountObjects, wallet.classicAddress);
          }
          this.txUiService.clearAllOptions();
     }

     onWeWantCurrencySelected(item: SelectItem | null): void {
          this.offerCurrency.selectWeWantCurrency(item?.id || 'XRP', this.currentWallet());
     }

     onWeWantIssuerSelected(item: SelectItem | null): void {
          this.offerCurrency.selectWeWantIssuer(item?.id || '', this.currentWallet());
     }

     onWeSpendCurrencySelected(item: SelectItem | null): void {
          this.offerCurrency.selectWeSpendCurrency(item?.id || 'XRP', this.currentWallet());
     }

     onWeSpendIssuerSelected(item: SelectItem | null): void {
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
          this.txUiService.clearAllOptions();
     }
}
