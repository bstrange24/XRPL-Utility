import { Component, OnInit, inject, ChangeDetectionStrategy, effect, computed, signal, input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { XrplDateService } from '../../core/xrpl-date.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { CHECK_TAB } from './constants/checks.constants';
import { CheckActionTypes, CheckTxConfig } from './constants/checks.types';
import { ChecksTransactionViewModelService } from '../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { ChecksStoreService } from '../../services/checks/checks-store/checks-store.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { ChecksRequirementInfoComponent } from './ui-components/checks-requirement-info/checks-requirement-info.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { CHECK_TAB_META, CHECK_TABS } from './constants/checks.ui';
import * as xrpl from 'xrpl';
import { ChecksCancelComponent } from './tab/checks-cancel/checks-cancel.component';
import { ChecksCashComponent } from './tab/checks-cash/checks-cash.component';
import { ChecksCreateComponent } from './tab/checks-create/checks-create.component';
import { XrplTransactionOrchestratorService } from '../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { ValidationService } from '../../services/utils/validation/transaction-validation-rule.service';
import { ChecksSummaryComponent } from './ui-components/checks-summary/checks-summary.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionPreviewComponent, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, ChecksCreateComponent, ChecksCashComponent, ChecksCancelComponent, ChecksCreateComponent, ChecksCashComponent],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly validationService = inject(ValidationService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly checksStoreService = inject(ChecksStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly tabs = CHECK_TABS;
     public readonly tabMeta = CHECK_TAB_META;
     public canCreateCheck = signal(false);
     public canCashCheck = signal(false);
     public resetTrigger = input<number>(0);
     public activeTabForRequirements = computed(() => this.checksTransactionViewModelService.activeTab());
     public lastIntendedDestination = signal<string>('');
     readonly summaryExpanded = signal<boolean>(false);

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
          this.applyTabFromQueryParam(this.route, CHECK_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance();
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

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.rightPanelService.resetFilters();
          this.clearInputFields();
          await this.getChecks(false);
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

     onCheckSelected(item: SelectItem | null) {
          if (item) {
               const [amount] = item.display.split(' ');
               this.checksStoreService.setField('amount', amount);
               this.checkUtilService.onCheckSelected(item);
          }
     }

     onCheckSelectedInUi(item: SelectItem | null) {
          if (item) {
               this.checksStoreService.setField('amount', item.amount!);
               this.checkUtilService.onCheckSelectedInUi(item);
          }
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.trustlineCurrencyService.refreshCurrentBalance();
          this.populateDefaultDateTime();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleOutstandingIOU() {
          this.trustlineStoreService.setField('outstandingIOUCollapsed', !this.trustlineStoreService.outstandingIOUCollapsed());
     }

     toggleOutstandingChecks() {
          this.checksStoreService.setField('outstandingChecksCollapsed', !this.checksStoreService.outstandingChecksCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!CHECK_TAB.includes(tab as any)) return;
          this.checksTransactionViewModelService.activeTab.set(tab as CheckActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getChecks();
     }

     async getChecks(forceRefresh = false): Promise<void> {
          const address = this.walletManager.getSelectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);
          await this.measure('getChecks', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    const currencyValue = this.currencyStoreService.currency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.currencyStoreService.issuer()) {
                         await this.trustlineUtilService.loadTrustlines(forceRefresh);
                         this.trustlineCurrencyService.selectCurrency(currencyValue);
                    }

                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.checksStoreService.setField('isCheckBlocked', this.utilsService.isFlagEnabled(env.accountInfo, 'disallowIncomingCheck'));
               } catch (error: any) {
                    console.error('Failed to load checks:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.checksTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';
          if (currentTab === 'createCheck') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.selectedDestinationAddress.set(destinationAddress);
               this.checksStoreService.setField('destination', destinationAddress);
          }

          if (currentTab === 'cashCheck' || currentTab === 'cancelCheck') {
               const checkId = this.checksStoreService.checkIdField();
               if (!checkId) {
                    this.toastService.error('Please select a valid Check ID', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
                    includeChecks: true,
                    includeTrustlines: true,
                    destinationAddress,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'cashCheck') {
               const checkObject = await this.xrplService.getCheckByCheckId(env.client, this.checksStoreService.checkIdField(), 'validated');
               // Fail fast if not found
               if (!checkObject) {
                    return this.toastService.error(`No check found with Check ID ${this.checksStoreService.checkIdField()}`, AppConstants.TOAST.ERROR);
               }
               this.checksStoreService.setField('checkCreator', checkObject.Account);

               // Expiration check (only if present)
               if (checkObject.Expiration) {
                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                    if (currentRippleTime >= checkObject.Expiration) {
                         return this.toastService.error('This check has expired.', AppConstants.TOAST.ERROR);
                    }
               }

               let checkIssuer;

               const currencyCode = this.currencyStoreService.currencyCode();
               const accountObjects = env.checkObjects?.result.account_objects;
               if (accountObjects) {
                    if (currencyCode !== AppConstants.XRP_CURRENCY) {
                         checkIssuer = this.checkUtilService.getIssuerForCheck(accountObjects, this.checksStoreService.checkIdField(), 'Token');
                         if (checkIssuer && this.currencyStoreService.currencyIssuer() !== checkIssuer) {
                              return this.toastService.error(`Invalid issuer ${checkIssuer} for this check`, AppConstants.TOAST.ERROR);
                         }
                    }
               }
          }

          const currencyState = this.currencyStoreService.getAll();
          const trustlineState = this.trustlineStoreService.getAll();
          const checkState = this.checksStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: CheckTxConfig = {
               check: checkState,
               account: accountState,
               trustline: trustlineState,
               currency: currencyState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCheckTx('createCheck', config);
                              break;
                         case 'cashCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCheckTx('cashCheck', config);
                              break;
                         case 'cancelCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCheckTx('cancelCheck', config);
                              break;
                    }
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

          await this.handleTxResult(txResult, env.client, env.wallet, checkState.checkCreator, this.checksStoreService.destination(), '', { includeCheckObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     protected override handleCachedAccountObjects(accountObjects: any, address: string): void {
          this.checksStoreService.setField('existingChecks', this.checkUtilService.getExistingChecks(accountObjects, address));
          this.checksStoreService.setField('cashableChecks', this.checkUtilService.getCashableChecks(accountObjects, address));
          this.checksStoreService.setField('cancellableChecks', this.checkUtilService.getCancelableChecks(accountObjects, address));
          this.checksStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.checksStoreService.setField('existingChecks', this.checkUtilService.getExistingChecks(env.accountObjects, env.wallet.classicAddress));
          this.checksStoreService.setField('cashableChecks', this.checkUtilService.getCashableChecks(env.accountObjects, env.wallet.classicAddress));
          this.checksStoreService.setField('cancellableChecks', this.checkUtilService.getCancelableChecks(env.accountObjects, env.wallet.classicAddress));
          this.checksStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
     }

     toggleExpiration(enabled: boolean): void {
          this.checksStoreService.setField('enableExpirationDate', enabled);
          if (!enabled) {
               this.checksStoreService.setField('checkExpirationDate', '');
          }
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               mainComponent: ChecksRequirementInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },

               summaryComponent: ChecksSummaryComponent,
               summaryInputs: {
                    info: this.checksTransactionViewModelService.infoData(),
                    tab: this.checksTransactionViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },
          });
     }

     onCanCreateCheckChange(isValid: boolean) {
          this.canCreateCheck.set(isValid);
     }

     onCanCashCheckChange(isValid: boolean) {
          this.canCashCheck.set(isValid);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.checksStoreService.setField('checkIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.checksStoreService.setField('destination', addr);
     }

     populateDefaultDateTime() {
          this.checksStoreService.setField('checkExpirationDate', '');
     }

     public canPerformAction = computed(() => {
          if (!this.connectionGuard.isConnectionReady()) return false;

          if (!this.isIdle() || !this.hasWallets()) return false;

          const tab = this.checksTransactionViewModelService.activeTab();

          // Force reactivity by reading key signals
          const selectedCheckId = this.checksStoreService.checkIdField?.() ?? '';

          switch (tab) {
               case 'createCheck':
                    return this.canCreateCheck();

               case 'cashCheck':
                    return this.canCashCheck();

               case 'cancelCheck':
                    return !!selectedCheckId; // Must have a selected check

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

          const tab = this.checksTransactionViewModelService.activeTab();
          const hasSelection = !!this.checksStoreService.checkIdField?.();

          if (!this.canPerformAction()) {
               if (tab === 'createCheck') {
                    return 'Please fill Destination and Amount';
               }
               if (tab === 'cashCheck' || tab === 'cancelCheck') {
                    if (!hasSelection) {
                         return 'Please select a check from the dropdown';
                    }
                    if (tab === 'cashCheck') {
                         if (this.checksTransactionViewModelService.selectedCheckIsExpired?.()) {
                              return 'This check has expired';
                         }
                         if (this.checksStoreService.amount() === '') {
                              return 'Amount to cash cannot be empty';
                         }

                         if (this.checksStoreService.amount()) {
                              const num = Number.parseFloat(this.checksStoreService.amount());
                              if (num > AppConstants.MAX_TOKEN_COUNT) {
                                   return 'Maximum XRP/Tokens cannot exceed 10,000,000,000,000,000.';
                              }
                              if (num < 0) {
                                   return 'Amount must be greater than 0';
                              }
                              if (num > Number.parseFloat(this.checksStoreService.totalCheckAmount())) {
                                   return `Amount exceeds total check value.`;
                              }
                         }
                    }
               }
               return 'Cannot perform this action';
          }

          return '';
     }

     protected clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.checksStoreService.setField('amount', '');
          this.checksStoreService.setField('checkIdField', '');
          this.checksStoreService.resetCheckFields();
          this.currencyStoreService.resetOptions();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.selectIssuer('XRP');
          this.txUiService.clearAllFields();
     }
}
