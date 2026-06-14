import { Component, inject, OnInit, ChangeDetectionStrategy, effect, computed, OnDestroy } from '@angular/core';
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
import { AmmRequirementsInfoComponent } from './ui-components/amm-requirements-info/amm-requirements-info.component';
import { AmmStoreService } from '../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AMM_TAB_META, AMM_TABS } from './constants/amm.ui';
import { AMM_TX_TYPES } from './constants/amm.constants';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { AmmActionTypes, AmmTxConfig } from './constants/amm.types';
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
import { AmmTransactionBuilderService } from '../../services/amm/amm-transaction-builder/amm-transaction-builder.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { OfferCurrencyService } from '../../services/offer/offer-currency/offer-currency.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';

@Component({
     selector: 'app-amm',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionPreviewComponent, AmmFieldsComponent],
     templateUrl: './amm.component.html',
     styleUrl: './amm.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAmmComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly accountConfiguratorStore = inject(AccountConfiguratorStoreService);
     public readonly ammTransactionOrchestratorService = inject(AmmTransactionOrchestratorService);
     public readonly ammTransactionBuilderService = inject(AmmTransactionBuilderService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly tabs = AMM_TABS;
     public readonly tabMeta = AMM_TAB_META;
     private refreshDebouncer: any;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // ===== Pool 1 (weWant) =====
          effect(() => {
               const currency = this.offerCurrency.weWant.currency();
               this.ammTransactionViewModelService.pool1Currency.set(currency);
               this.ammStoreService.setField('weWantCurrency', currency);
          });

          effect(() => {
               const issuer = this.offerCurrency.weWant.issuer();
               this.ammTransactionViewModelService.pool1Issuer.set(issuer);
               this.ammStoreService.setField('weWantIssuer', issuer);
          });

          effect(() => {
               const issuers = this.offerCurrency.weWant.issuers();

               this.ammTransactionViewModelService.pool1IssuersTrigger.update(n => n + 1);

               if (issuers.length > 0 && !this.offerCurrency.weWant.issuer()) {
                    this.offerCurrency.selectWeWantIssuer(issuers[0].address, this.currentWallet());
               }
          });

          // ===== Pool 2 (weSpend) =====
          effect(() => {
               const currency = this.offerCurrency.weSpend.currency();
               this.ammTransactionViewModelService.pool2Currency.set(currency);
               this.ammStoreService.setField('weSpendCurrency', currency);
          });

          effect(() => {
               const issuer = this.offerCurrency.weSpend.issuer();
               this.ammTransactionViewModelService.pool2Issuer.set(issuer);
               this.ammStoreService.setField('weSpendIssuer', issuer);
          });

          effect(() => {
               const issuers = this.offerCurrency.weSpend.issuers();

               this.ammTransactionViewModelService.pool2IssuersTrigger.update(n => n + 1);

               if (issuers.length > 0 && !this.offerCurrency.weSpend.issuer()) {
                    this.offerCurrency.selectWeSpendIssuer(issuers[0].address, this.currentWallet());
               }
          });

          effect(() => {
               const currency1 = this.offerCurrency.weWant.currency();
               const issuer1 = this.offerCurrency.weWant.issuer();
               const currency2 = this.offerCurrency.weSpend.currency();

               // Only refresh if we have both assets selected
               if (currency1 && issuer1 && currency2) {
                    this.refreshAmmData();
               }
          });

          // this.rightPanelService.setPanel({
          //      mainComponent: AmmRequirementsInfoComponent,
          //      mainInputs: {
          //           activeTab: this.ammTransactionViewModelService.activeTab,
          //      },

          //      // Add summary here when you want it (e.g. on Credentials page)
          //      // summaryComponent: CredentialsSummaryComponent,
          //      // summaryInputs: { ... }
          // });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, AMM_TX_TYPES as any, tab => this.setTab(tab));

          this.transactionDropdownService.loadCustomDestinations();
          this.setRightPanel();

          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);

          // Default pool 2
          this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet());
          this.offerCurrency.selectWeSpendIssuer('', this.currentWallet());
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

     activeTabForRequirements = computed(() => this.ammTransactionViewModelService.activeTab());

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: AmmSummaryComponent,
               summaryInputs: {
                    // info: this.ammTransactionViewModelService.infoData(),
                    tab: this.ammTransactionViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },

               mainComponent: AmmRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },
          });
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
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
          const allowed = Object.values(AMM_TX_TYPES) as string[];
          if (!allowed.includes(tab)) return;
          this.ammTransactionViewModelService.activeTab.set(tab as AmmActionTypes);
          this.ammUtilsService.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) await this.onAccountChange(false);
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

               if (!this.walletManagerService.ensureWalletSelected()) return;
               const wallet = this.walletManagerService.getSelectedWallet();

               let env: any = null;
               if (this.ammStoreService.weWantCurrency() && this.ammStoreService.weSpendCurrency()) {
                    const asset = this.ammTransactionBuilderService.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.ammStoreService.weWantCurrency()), this.ammStoreService.weWantIssuer());
                    const asset2 = this.ammTransactionBuilderService.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.ammStoreService.weSpendCurrency()), this.ammStoreService.weSpendIssuer());

                    env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet!, {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeAmmResponse: true,
                         includeParticipation: true,
                         forceRefresh: forceRefresh,
                         asset,
                         asset2,
                    });
                    if (!env) throw new Error('Unable to get environment.');

                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.ammUtilsService.clearInputFields();
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
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          if (currentTab === 'swapViaAMM' && !destination?.trim()) {
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

          try {
               txResult = await this.ammTransactionOrchestratorService.executeAmmTx(currentTab, config);
          } catch (error: any) {
               console.error(`[${currentTab}] execution failed:`, error);
               this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               return;
          }

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, null, null, '');
          this.trustlineCurrencyService.refreshCurrentBalance();
          await this.refreshAmmData();
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(_env: any): Promise<void> {
          return;
     }

     async onPool1CurrencySelected(item: SelectItem | null): Promise<void> {
          const currency = item?.id || 'XRP';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeWantCurrency(currency, wallet);

          // Refresh AMM data with new asset pair
          await this.refreshAmmData();
     }

     async onPool1IssuerSelected(item: SelectItem | null): Promise<void> {
          const issuer = item?.id || '';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeWantIssuer(issuer, wallet);

          // Refresh AMM data with new asset pair
          await this.refreshAmmData();
     }

     async onPool2CurrencySelected(item: SelectItem | null): Promise<void> {
          const currency = item?.id || 'XRP';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeSpendCurrency(currency, wallet);

          // Refresh AMM data with new asset pair
          await this.refreshAmmData();
     }

     async onPool2IssuerSelected(item: SelectItem | null): Promise<void> {
          const issuer = item?.id || '';
          const wallet = this.currentWallet();

          if (!wallet) return;

          await this.offerCurrency.selectWeSpendIssuer(issuer, wallet);

          // Refresh AMM data with new asset pair
          await this.refreshAmmData();
     }

     async refreshAmmData(): Promise<void> {
          clearTimeout(this.refreshDebouncer);
          this.refreshDebouncer = setTimeout(async () => {
               const wallet = this.walletManagerService.getSelectedWallet();
               if (!wallet?.classicAddress) return;

               try {
                    await this.offerCurrency.refreshBothBalances(wallet);

                    const asset = this.ammTransactionBuilderService.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.ammStoreService.weWantCurrency()), this.ammStoreService.weWantIssuer());
                    const asset2 = this.ammTransactionBuilderService.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.ammStoreService.weSpendCurrency()), this.ammStoreService.weSpendIssuer());

                    const env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeAmmResponse: true,
                         includeParticipation: true,
                         forceRefresh: true, // Force refresh to get latest data
                         asset,
                         asset2,
                    });

                    if (env) {
                         this.updateSharedObjectsStore(env);
                         this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                         this.offerCurrency.refreshXrpBalance(wallet);
                    }
               } catch (error) {
                    console.error('Failed to refresh AMM data:', error);
               }
          }, 300);
     }

     handleSearchQueryChange(query: string): void {
          this.destinationSearchQuery.set(query);
          this.ammStoreService.setField('ammIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null): void {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.ammStoreService.setField('destination', addr);
     }

     protected clearInputFields(): void {
          this.ammUtilsService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.txUiService.disableAdditionalFields();
     }
}
