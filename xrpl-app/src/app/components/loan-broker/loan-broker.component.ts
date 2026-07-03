import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as xrpl from 'xrpl';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { LendingBrokerModifyComponent } from './tab/lending-broker-modify/lending-broker-modify.component';
import { LendingBrokerSetComponent } from './tab/lending-broker-set/lending-broker-set.component';
import { LendingBrokerDeleteComponent } from './tab/lending-broker-delete/lending-broker-delete.component';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { LoanUtilService } from '../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../services/loan/loan-view-model/loan-view-model.service';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { VaultCacheService } from '../../services/vault/vault-cache/vault-cache.service';
import { VaultStoreService } from '../../services/vault/vault-store/vault-store.service';
import { VaultUtilService } from '../../services/vault/vault-util/vault-util.service';
import { VaultViewModelService } from '../../services/vault/vault-view-model/vault-view-model.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { LOAN_BROKER_TAB, LoanBrokerConfig } from './constants/loan-broker.types';
import { DropdownItem } from '../../models/dropdown-item.model';
import { AppConstants } from '../../core/app.constants';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LoanBrokerSummaryComponent } from './ui-components/loan-broker-summary/loan-broker-summary.component';
import { LoanBrokerUtilService } from '../../services/loan-broker/loan-broker-util/loan-broker-util.service';
import { LoanBrokerViewModelService } from '../../services/loan-broker/loan-broker-view-model/loan-broker-view-model.service';
import { LendingBrokerCoverWithdrawComponent } from './tab/lending-broker-cover-withdraw/lending-broker-cover-withdraw.component';
import { LendingBrokerCoverDepositComponent } from './tab/lending-broker-cover-deposit/lending-broker-cover-deposit.component';
import { LendingBrokerCoverClawbackComponent } from './tab/lending-broker-cover-clawback/lending-broker-cover-clawback.component';
import { LOAN_BROKER_TAB_META, LOAN_BROKER_TABS } from './constants/loan-broker.ui';
import { LoanBrokerTransactionOrchestratorService } from '../../services/loan-broker/loan-broker-transaction-orchestrator/loan-broker-transaction-orchestrator.service';
import { LoanBrokerStoreService } from '../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { LoanDefaultComponent } from '../loan/tab/loan-default/loan-default.component';
import { LoanImpairComponent } from '../loan/tab/loan-impair/loan-impair.component';
import { LoanUnimpairComponent } from '../loan/tab/loan-unimpair/loan-unimpair.component';
import { LoanManageComponent } from '../loan/tab/loan-manage/loan-manage.component';

@Component({
     selector: 'app-loan-broker',
     standalone: true,
     imports: [
          CommonModule,
          FormsModule,
          LucideAngularModule,
          ButtonTooltipComponent,
          OverlayModule,
          TransactionPreviewComponent,
          ExecutionTimeDisplayComponent,
          TabMenuWithInfoComponent,
          WarningMessageComponent,
          TransactionOptionsComponent,
          LendingBrokerSetComponent,
          LendingBrokerModifyComponent,
          LendingBrokerDeleteComponent,
          LendingBrokerCoverWithdrawComponent,
          LendingBrokerCoverDepositComponent,
          LendingBrokerCoverClawbackComponent,
          LoanDefaultComponent,
          LoanImpairComponent,
          LoanUnimpairComponent,
          LoanManageComponent,
     ],
     templateUrl: './loan-broker.component.html',
     styleUrl: './loan-broker.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanBrokerComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly mptOrchestratorServiceService = inject(MptOrchestratorServiceService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly mptStoreService = inject(MptStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly vaultCacheService = inject(VaultCacheService);
     public readonly lendingViewModelService = inject(LoanViewModelService);
     public readonly lendingUtilService = inject(LoanUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerTransactionOrchestratorService = inject(LoanBrokerTransactionOrchestratorService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);

     public readonly tabs = LOAN_BROKER_TABS;
     public readonly tabMeta = LOAN_BROKER_TAB_META;
     public canCreateVault = signal(false);
     public vaultValidationErrors = signal<string[]>([]);
     public resetTrigger = input<number>(0);
     private readonly _lastIntendedDestination = signal<string>('');
     public readonly lastIntendedDestination = computed(() => this._lastIntendedDestination());
     public canCoverWithdraw = signal(false);
     public canDeleteBroker = signal(false);
     public canModifyBroker = signal(false);
     public canCreateBroker = signal(false);
     public canCoverDeposit = signal(false);
     public canCoverClawback = signal(false);
     public canModifyLoan = signal(false);
     public canDefaultLoan = signal(false);
     public canImpairLoan = signal(false);
     public canUnimpairLoan = signal(false);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
          });
     }

     activeTabForRequirements = computed(() => this.vaultViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, LOAN_BROKER_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.transactionDropdownService.loadCustomDestinations();

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

     public get activeTab() {
          return this.loanBrokerViewModelService.activeTab();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.rightPanelService.resetFilters();
          this.clearInputFields();
          await this.getLoanBroker(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
          this.trustlineCurrencyService.refreshCurrentBalance();
          this.clearInputFields();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!LOAN_BROKER_TAB.includes(tab as any)) return;
          this.loanBrokerViewModelService.activeTab.set(tab as any);
          this.clearInputFields();
          if (this.hasWallets()) await this.getLoanBroker(false);
     }

     async getLoanBroker(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getLoanBroker', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    await this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to get vaults:', error);
                    this.toastService.error(error.message || 'Failed to get vaults', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     public async performAction(): Promise<void> {
          const currentTab = this.loanBrokerViewModelService.activeTab();
          const wallet = this.currentWallet();

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    incudeVaults: true,
                    includeLoanBrokers: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          // Get all state
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();
          const brokerState = this.loanBrokerStoreService.getAll();

          // Get destination info for withdraw
          let destinationAddress = '';
          let destinationTag: number | null = null;
          if (currentTab === 'coverWithdraw') {
               destinationAddress = this.loanBrokerViewModelService.selectedDestinationAddress();
               if (destinationAddress && !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
                    return;
               }
               destinationTag = this.loanBrokerViewModelService.selectedDestinationTag() ?? null;
          }

          const config: LoanBrokerConfig = {
               broker: {
                    ...brokerState,
                    destination: destinationAddress,
                    destinationTag: destinationTag,
               },
               account: accountState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {
                    destinationAddress,
                    destinationTag,
               },
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createBroker':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('createBroker', config);
                              break;
                         case 'modifyBroker':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('modifyBroker', config);
                              break;
                         case 'deleteBroker':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('deleteBroker', config);
                              break;
                         case 'coverDeposit':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('coverDeposit', config);
                              break;
                         case 'coverWithdraw':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('coverWithdraw', config);
                              break;
                         case 'coverClawback':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('coverClawback', config);
                              break;
                         case 'modifyLoan':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('modifyLoan', config);
                              break;
                         case 'impairLoan':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('impairLoan', config);
                              break;
                         case 'unimpairLoan':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('unimpairLoan', config);
                              break;
                         case 'defaultLoan':
                              txResult = await this.loanBrokerTransactionOrchestratorService.executeLoanBrokerTx('defaultLoan', config);
                              break;
                         default:
                              throw new Error(`Unknown tab: ${currentTab}`);
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

          await this.handleTxResult(txResult, env.client, env.wallet, '', '', '', {});
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          const existingBrokers = await this.loanBrokerUtilService.getExistingBrokers(env.accountObjects, env.wallet.classicAddress);
          this.loanBrokerStoreService.setField('existingBrokers', existingBrokers);

          const vaults = await this.vaultUtilService.getExistingVaults(env.accountObjects, env.wallet.classicAddress, this.vaultViewModelService.activeTab());
          this.vaultStoreService.setField('existingVaults', vaults);
          // Update cache
          vaults.forEach((vault: any) => {
               if (vault.index || vault.id) {
                    this.vaultCacheService.setVault(vault.index || vault.id, vault);
               }
          });
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: LoanBrokerSummaryComponent,
               summaryInputs: {
                    info: this.loanBrokerViewModelService.infoData(),
                    tab: this.loanBrokerViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
                    wallet: this.currentWallet(),
                    brokerLength: this.loanBrokerViewModelService.infoData()?.brokerCount ?? 0,
               },
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
                    page: this.activeTabForRequirements,
               },
          });
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.vaultStoreService.setField('destination', addr);
     }

     handleDestinationTagChange(tag: number | null) {
          this.loanBrokerViewModelService.selectedDestinationTag.set(tag ?? null);
     }

     onCanCoverWithdrawChange(isValid: boolean) {
          this.canCoverWithdraw.set(isValid);
     }

     onCanDeleteBrokerChange(isValid: boolean) {
          this.canDeleteBroker.set(isValid);
     }

     onCanModifyBrokerChange(isValid: boolean) {
          this.canModifyBroker.set(isValid);
     }

     onCanCreateBrokerChange(isValid: boolean) {
          this.canCreateBroker.set(isValid);
     }

     onCanCoverDepositChange(isValid: boolean) {
          this.canCoverDeposit.set(isValid);
     }

     onCanCoverClawbackChange(isValid: boolean) {
          this.canCoverClawback.set(isValid);
     }

     onCanDefaultLoanChange(isValid: boolean) {
          this.canDefaultLoan.set(isValid);
     }

     onCanModifyLoanChange(isValid: boolean) {
          this.canModifyLoan.set(isValid);
     }

     onCanImpairLoanChange(isValid: boolean) {
          this.canImpairLoan.set(isValid);
     }

     onCanUnimpairLoanChange(isValid: boolean) {
          this.canUnimpairLoan.set(isValid);
     }

     canPerformAction = computed(() => {
          const tab = this.loanBrokerViewModelService.activeTab();

          switch (tab) {
               case 'createBroker':
                    return this.canCreateBroker();
               case 'modifyBroker':
                    return this.canModifyBroker();
               case 'deleteBroker':
                    return this.canDeleteBroker();
               case 'coverWithdraw':
                    return this.canCoverWithdraw();
               case 'coverDeposit':
                    return this.canCoverDeposit();
               case 'coverClawback':
                    return this.canCoverClawback();
               case 'modifyLoan':
                    return this.canModifyLoan();
               case 'defaultLoan':
                    return this.canDefaultLoan();
               case 'impairLoan':
                    return this.canImpairLoan();
               case 'unimpairLoan':
                    return this.canUnimpairLoan();
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

          // const tab = this.checksTransactionViewModelService.activeTab();
          // const hasSelection = !!this.checksStoreService.checkIdField?.();

          // if (!this.canPerformAction()) {
          //      if (tab === 'createCheck') {
          //           return 'Please fill Destination and Amount';
          //      }
          //      if (tab === 'cashCheck' || tab === 'cancelCheck') {
          //           if (!hasSelection) {
          //                return 'Please select a check from the dropdown';
          //           }
          //           if (tab === 'cashCheck') {
          //                if (this.checksTransactionViewModelService.selectedCheckIsExpired?.()) {
          //                     return 'This check has expired';
          //                }
          //                if (this.checksStoreService.amount() === '') {
          //                     return 'Amount to cash cannot be empty';
          //                }

          //                if (this.checksStoreService.amount()) {
          //                     const num = Number.parseFloat(this.checksStoreService.amount());
          //                     if (num > AppConstants.MAX_TOKEN_COUNT) {
          //                          return 'Maximum XRP/Tokens cannot exceed 10,000,000,000,000,000.';
          //                     }
          //                     if (num < 0) {
          //                          return 'Amount must be greater than 0';
          //                     }
          //                     if (num > Number.parseFloat(this.checksStoreService.totalCheckAmount())) {
          //                          return `Amount exceeds total check value.`;
          //                     }
          //                }
          //           }
          //      }
          //      return 'Cannot perform this action';
          // }

          return '';
     }

     protected override clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.currencyStoreService.resetOptions();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.selectIssuer('XRP');
          this.txUiService.disableAdditionalFields();

          // Reset form fields but keep existing vaults
          this.vaultStoreService.setField('amount', '');
          this.vaultStoreService.setField('vaultMetaData', '');
          this.vaultStoreService.setField('selectedVaultId', null);
          this.vaultStoreService.setField('vaultAmount', '');
     }
}
