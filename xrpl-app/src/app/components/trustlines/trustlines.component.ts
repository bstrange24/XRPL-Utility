import { Component, OnInit, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { CurrencyFormSectionComponent } from '../shared/currency-form-section/currency-form-section.component';
import { ActivatedRoute } from '@angular/router';
import { TrustlineRequirementsInfoComponent } from './ui-components/trustline-requirements-info/trustline-requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/local-storage/storage.service';
import { TRUSTLINE_TAB_META, TRUSTLINE_TABS, SET_FLAGS, CLEAR_FLAGS } from './constants/trustline.ui';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
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

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, CurrencyFormSectionComponent, TrustlineRequirementsInfoComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, TrustlineFlagsComponent, TrustlineIssuersComponent, TrustlineIssueComponent, TrustlineClawbackComponent, SummaryComponent],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
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
          await this.getTrustlinesForAccount(false);
     }

     async onCurrencyChange(item: any) {
          const currency = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.syncAfterSelection();
     }

     async onIssuerChange(item: any) {
          const issuer = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectIssuer(issuer);
          await this.syncAfterSelection();
     }

     async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
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
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.trustlineCurrencyService.refreshCurrentBalance();
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
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
          this.destinationSearchQuery.set('');

          // await this.trustlineUtilService.loadTrustlines();
          this.clearInputFields();
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getTrustlinesForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.ensureWalletSelected()) return;

               await this.trustlineUtilService.loadTrustlines(forceRefresh);
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.trustlineViewModelService.activeTab();
          const wallet = this.currentWallet();
          let destination = '';

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
               destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.currencyStoreService.setField('destination', destination);
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
                    ...(currentTab === 'issueCurrency' || currentTab === 'clawbackTokens' ? { destination: destination } : {}),
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

          if (!txResult) throw new Error('Unable error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, destination);
          await this.trustlineCurrencyService.refreshCurrentBalance();
          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
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
     }
}
