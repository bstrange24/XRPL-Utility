import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { Subject, takeUntil } from 'rxjs';
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
import { AmmRequirementsInfoComponent } from './ui-components/amm-requirements-info/amm-requirements-info.component';
import { AmmStoreService } from '../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AMM_TAB_META, AMM_TABS } from './constants/amm.ui';
import { AMM_TX_TYPES } from './constants/amm.constants';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { AmmActionTypes, AmmTxConfig, AmmTxType } from './constants/amm.types';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { AmmUtilsService } from '../../services/amm/amm-utils/amm-utils.service';
import { AmmTransactionOrchestratorService } from '../../services/amm/amm-transaction-orchestrator/amm-transaction-orchestrator.service';
import { AmmFieldsComponent } from './tab/amm-fields/amm-fields.component';
import { AmmSummaryComponent } from './ui-components/amm-summary/amm-summary.component';

@Component({
     selector: 'app-amm',
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
          AmmRequirementsInfoComponent,
          AmmFieldsComponent,
          AmmSummaryComponent,
     ],
     templateUrl: './amm.component.html',
     styleUrl: './amm.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAmmComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly accountConfiguratorStore = inject(AccountConfiguratorStoreService);
     public readonly ammTransactionOrchestratorService = inject(AmmTransactionOrchestratorService);
     public readonly ammUtilsService = inject(AmmUtilsService);

     readonly menuTabs: TabConfig[] = AMM_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = AMM_TAB_META;

     private readonly destroy$ = new Subject<void>();

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
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, AMM_TX_TYPES as any, tab => this.setTab(tab));

          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);

          // Sync Pool 1 (weWant) state to view model signals
          this.offerCurrency.weWant.currency$.pipe(takeUntil(this.destroy$)).subscribe(currency => {
               this.ammTransactionViewModelService.pool1Currency.set(currency);
               this.ammStoreService.setField('weWantCurrency', currency);
          });
          this.offerCurrency.weWant.issuer$.pipe(takeUntil(this.destroy$)).subscribe(issuer => {
               this.ammTransactionViewModelService.pool1Issuer.set(issuer);
               this.ammStoreService.setField('weWantIssuer', issuer);
          });
          this.offerCurrency.weWant.issuers$.pipe(takeUntil(this.destroy$)).subscribe(() => {
               this.ammTransactionViewModelService.pool1IssuersTrigger.update(n => n + 1);
               const firstIssuer = this.offerCurrency.weWant.issuers$.value[0]?.address ?? '';
               this.offerCurrency.selectWeWantIssuer(firstIssuer, this.currentWallet());
          });

          // Sync Pool 2 (weSpend) state to view model signals
          this.offerCurrency.weSpend.currency$.pipe(takeUntil(this.destroy$)).subscribe(currency => {
               this.ammTransactionViewModelService.pool2Currency.set(currency);
               this.ammStoreService.setField('weSpendCurrency', currency);
          });
          this.offerCurrency.weSpend.issuer$.pipe(takeUntil(this.destroy$)).subscribe(issuer => {
               this.ammTransactionViewModelService.pool2Issuer.set(issuer);
               this.ammStoreService.setField('weSpendIssuer', issuer);
          });
          this.offerCurrency.weSpend.issuers$.pipe(takeUntil(this.destroy$)).subscribe(() => {
               this.ammTransactionViewModelService.pool2IssuersTrigger.update(n => n + 1);
               const firstIssuer = this.offerCurrency.weSpend.issuers$.value[0]?.address ?? '';
               this.offerCurrency.selectWeSpendIssuer(firstIssuer, this.currentWallet());
          });

          // Default pool 2 to XRP
          this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet());
          this.offerCurrency.selectWeSpendIssuer('', this.currentWallet());
          this.txUiService.clearAllOptions();
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.onAccountChange(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.accountConfiguratorStoreService.resetAll();

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.offerCurrency.setWalletAddress(wallet.address);
          this.trustlineCurrencyService.refreshCurrentBalance();
     }

     async setTab(tab: string): Promise<void> {
          const allowed = Object.values(AMM_TX_TYPES) as string[];
          if (allowed.includes(tab)) {
               this.ammTransactionViewModelService.activeTab.set(tab as AmmActionTypes);
               this.ammUtilsService.clearInputFields();
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

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.ammUtilsService.clearInputFields();
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.ammTransactionViewModelService.activeTab();
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

          const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          if (currentTab === 'swapViaAMM' && (!destination || !destination.trim())) {
               this.toastService.error('Please enter a valid destination address for the swap.', AppConstants.TOAST.ERROR);
               return;
          }

          const ammState = this.ammStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: AmmTxConfig = {
               amm: ammState,
               account: accountState,
               txOptions: txOptionsState,
               wallet,
               preFetchedEnv: env,
               extra: {
                    depositOptions: this.ammUtilsService.depositOptions(),
                    withdrawOptions: this.ammUtilsService.withdrawOptions(),
                    destination,
               },
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    txResult = await this.ammTransactionOrchestratorService.executeAmmTx(currentTab as AmmTxType, config);
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, null, null, '');
          this.txUiService.resetCurrentStepToIdle();
     }

     onPool1CurrencySelected(item: SelectItem | null): void {
          const currency = item?.id || 'XRP';
          this.offerCurrency.selectWeWantCurrency(currency, this.currentWallet());
     }

     onPool1IssuerSelected(item: SelectItem | null): void {
          const address = item?.id || '';
          this.offerCurrency.selectWeWantIssuer(address, this.currentWallet());
     }

     onPool2CurrencySelected(item: SelectItem | null): void {
          const currency = item?.id || 'XRP';
          this.offerCurrency.selectWeSpendCurrency(currency, this.currentWallet());
     }

     onPool2IssuerSelected(item: SelectItem | null): void {
          const address = item?.id || '';
          this.offerCurrency.selectWeSpendIssuer(address, this.currentWallet());
     }

     handleSearchQueryChange(query: string): void {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null): void {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     protected refreshAccountObject(_env: any): void {
          return;
     }

     protected clearInputFields(): void {
          this.ammUtilsService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
     }
}
