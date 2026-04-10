import { Component, OnInit, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CurrencyFormSectionComponent } from '../shared/currency-form-section/currency-form-section.component';
import { ActivatedRoute } from '@angular/router';
import { TrustlineRequirementsInfoComponent } from './ui-components/trustline-requirements-info/trustline-requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TRUSTLINE_TAB_META, TRUSTLINE_TABS, SET_FLAGS, CLEAR_FLAGS } from './constants/trustline.ui';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { TRUSTLINE, TRUSTLINE_TAB } from './constants/trustline.constants';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { TrustlineViewModelService } from '../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { TrustlineActionTypes } from './constants/trustline.types';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TrustlineFlagsComponent } from './tab/trustline-flags/trustline-flags.component';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineTransactionOrchestratorService } from '../../services/trustlines/trustline-transaction-orchestrator/trustline-transaction-orchestrator.service';
import { TrustlineIssuersComponent } from './tab/trustline-issuers/trustline-issuers.component';
import { TrustlineIssueComponent } from './tab/trustline-issue/trustline-issue.component';
import { TrustlineClawbackComponent } from './tab/trustline-clawback/trustline-clawback.component';
import { SummaryComponent } from './ui-components/summary/summary.component';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { UtilsService } from '../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, CurrencyFormSectionComponent, TrustlineRequirementsInfoComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, TrustlineFlagsComponent, TrustlineIssuersComponent, TrustlineIssueComponent, TrustlineClawbackComponent, SummaryComponent],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly trustlineTransactionOrchestratorService = inject(TrustlineTransactionOrchestratorService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     readonly menuTabs: TabConfig[] = TRUSTLINE_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = TRUSTLINE_TAB_META;
     readonly setFlags: Record<string, any> = SET_FLAGS;
     readonly clearFlags: Record<string, any> = CLEAR_FLAGS;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, TRUSTLINE_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(false);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(false);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
     }

     readonly isCurrencyFlow = computed(() => {
          const tab = this.trustlineViewModelService.activeTab();
          return ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens'].includes(tab);
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getTrustlinesForAccount(true);
     }

     async onCurrencyChange(item: any) {
          this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP');
          await this.syncAfterSelection();
     }

     async onIssuerChange(item: any) {
          this.trustlineCurrencyService.selectIssuer(item?.id ?? item ?? 'XRP');
          await this.syncAfterSelection();
     }

     async onCurrencySelected(item: SelectItem | null) {
          this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP');
          await this.trustlineUtilService.loadTrustlines(false);
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);

          // Add this: If both currency and issuer are set, fetch env and update flags
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
          }
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          this.infoPanelExpanded.set(false);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleOutstandingIOU() {
          this.trustlineStoreService.setField('outstandingIOUCollapsed', !this.trustlineStoreService.outstandingIOUCollapsed());
     }

     onFlagChange(flag: string) {
          if (this.trustlineCurrencyService.trustlineFlags[flag]) {
               TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineCurrencyService.trustlineFlags[conflict] = false;
               });
          }
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!TRUSTLINE_TAB.includes(tab as any)) return;
          this.trustlineViewModelService.activeTab.set(tab as TrustlineActionTypes);
          this.trustlineUtilService.activeTab.set(tab as TrustlineActionTypes);
          this.clearInputFields();
          if (this.hasWallets() && this.trustlineStoreService.isLoaded()) {
               await this.getTrustlinesForAccount();
          }
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          const address = this.walletManager.selectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);
          await this.measure('getTrustlinesForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               // Keep existingIOUs intact for stale-while-revalidate; only reset loading/error state.
               this.trustlineStoreService.setField('isLoading', true);
               this.trustlineStoreService.setField('error', '');

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    await this.trustlineUtilService.loadTrustlines(forceRefresh);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to load trustlines:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.trustlineViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';

          // Special case for non-TX tab
          if (currentTab === 'addNewIssuers') {
               return;
          }

          if (currentTab === 'setTrustline') {
               const trustLineflags = this.trustlineCurrencyService.flags();
               if (trustLineflags['tfSetNoRipple'] && trustLineflags['tfClearNoRipple']) {
                    this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                    return;
               }
               if (trustLineflags['tfSetFreeze'] && trustLineflags['tfClearFreeze']) {
                    this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                    return;
               }
               let flags = 0;
               Object.entries(this.trustlineCurrencyService.flags()).forEach(([key, value]) => {
                    if (value) {
                         flags |= TRUSTLINE.FLAG_MAP[key as keyof typeof TRUSTLINE.FLAG_MAP];
                    }
               });

               this.trustlineStoreService.setField('trustlineFlags', flags);
          }

          if (currentTab === 'issueCurrency' || currentTab === 'clawbackTokens') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.currencyStoreService.setField('destination', destinationAddress);
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    ...(currentTab === 'issueCurrency' || currentTab === 'clawbackTokens' ? { destination: destinationAddress } : {}),
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          if (currentTab === 'removeTrustline') {
               const trustLineflags = this.trustlineCurrencyService.flags();
               if (trustLineflags['tfSetNoRipple'] && trustLineflags['tfClearNoRipple']) {
                    this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                    return;
               }
               if (trustLineflags['tfSetFreeze'] && trustLineflags['tfClearFreeze']) {
                    this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                    return;
               }

               const trustLine = env.trustlines?.result.lines.find((line: any) => {
                    const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                    return line.account === this.currencyStoreService.issuer() && lineCurrency === this.currencyStoreService.currency();
               });

               if (!trustLine) {
                    this.toastService.error(`No trust line found for ${this.currencyStoreService.currency()} to issuer ${this.currencyStoreService.issuer()}`, AppConstants.TOAST.ERROR);
                    return;
               }

               let flags = 0;
               Object.entries(this.trustlineCurrencyService.flags()).forEach(([key, value]) => {
                    if (value) {
                         flags |= TRUSTLINE.FLAG_MAP[key as keyof typeof TRUSTLINE.FLAG_MAP];
                    }
               });

               this.trustlineStoreService.setField('trustlineFlags', flags);

               const check = this.trustlineUtilService.canRemoveTrustline(trustLine);
               if (!check.canRemove) {
                    this.toastService.error(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`, AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const trustline = this.trustlineStoreService.getAll();
          const currency = this.currencyStoreService.getAll();
          const account = this.accountConfiguratorStoreService.getAll();
          const txOptions = this.xrplTxOptionsStore.getAll();

          const config = {
               trustline,
               currency,
               account,
               txOptions,
               wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'setTrustline':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('setTrustline', config);
                              break;
                         case 'removeTrustline':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('removeTrustline', config);
                              break;
                         case 'issueCurrency':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('issueCurrency', config);
                              break;
                         case 'clawbackTokens':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('clawbackTokens', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, destinationAddress);
          await this.trustlineCurrencyService.refreshCurrentBalance();
          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     /** Stale-while-revalidate: populate existingIOUs from cached account objects instantly. */
     protected override handleCachedAccountObjects(accountObjects: xrpl.AccountObjectsResponse, address: string): void {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     protected clearInputFields(): void {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.trustlineCurrencyService.clearFlagsValue(this.trustlineViewModelService.activeTab());
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
