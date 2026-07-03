import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { VaultCacheService } from '../../services/vault/vault-cache/vault-cache.service';
import { VaultStoreService } from '../../services/vault/vault-store/vault-store.service';
import { VaultUtilService } from '../../services/vault/vault-util/vault-util.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { AppConstants } from '../../core/app.constants';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LoanSummaryComponent } from './ui-components/loan-summary/loan-summary.component';
import { LoanViewModelService } from '../../services/loan/loan-view-model/loan-view-model.service';
import { LoanUtilService } from '../../services/loan/loan-util/loan-util.service';
import { LoanPayComponent } from './tab/loan-pay/loan-pay.component';
import { LOAN_TAB_META, LOAN_TABS } from './constants/loan.ui';
import { LOAN_TAB, LoanActionTypes } from './constants/loan.types';
import { LoanTransactionOrchestratorService } from '../../services/loan/loan-transaction-orchestrator/loan-transaction-orchestrator.service';
import { LoanSetComponent } from './tab/loan-set/loan-set.component';
import { LoanDeleteComponent } from './tab/loan-delete/loan-delete.component';
import { LoanStoreService } from '../../services/loan/loan-store/loan-store.service';
import { LoanBrokerStoreService } from '../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { LoanBrokerUtilService } from '../../services/loan-broker/loan-broker-util/loan-broker-util.service';

@Component({
     selector: 'app-loan',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, LoanSetComponent, LoanPayComponent, LoanDeleteComponent],
     templateUrl: './loan.component.html',
     styleUrl: './loan.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanComponent extends WalletDestinationBase implements OnInit, OnDestroy {
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
     public readonly mptStoreService = inject(MptStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     private readonly loanTransactionOrchestratorService = inject(LoanTransactionOrchestratorService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly vaultCacheService = inject(VaultCacheService);
     public readonly loanViewModelService = inject(LoanViewModelService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     private readonly xrplCacheService = inject(XrplCacheService);

     public readonly tabMeta = LOAN_TAB_META;
     public canCreateLoan = signal(false);
     public canPayLoan = signal(false);
     public canDeleteLoan = signal(false);

     public vaultValidationErrors = signal<string[]>([]);
     public resetTrigger = input<number>(0);
     private readonly _lastIntendedDestination = signal<string>('');
     public readonly lastIntendedDestination = computed(() => this._lastIntendedDestination());

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
          });
     }

     activeTabForRequirements = computed(() => this.loanViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, LOAN_TAB, tab => this.setTab(tab));
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

     tabs = computed(() => {
          return LOAN_TABS.map(tab => {
               console.log('tab:', tab);
               return tab;
          });
     });

     public get activeTab() {
          console.log('activeTab:', this.loanViewModelService.activeTab());
          return this.loanViewModelService.activeTab();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.rightPanelService.resetFilters();
          this.clearInputFields();
          await this.getLoans(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
          this.clearInputFields();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!LOAN_TAB.includes(tab as any)) return;
          this.loanViewModelService.activeTab.set(tab as LoanActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getLoans(false);
     }

     async getLoans(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getLoans', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    await this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to get loans:', error);
                    this.toastService.error(error.message || 'Failed to get loans', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     public async performAction(): Promise<void> {
          let currentTab = this.loanViewModelService.activeTab();
          let wallet = this.currentWallet();

          // If creating a loan, ensure we're using the vault owner
          if (currentTab === 'createLoan') {
               // Get the selected LoanBroker to find its owner
               const brokers = this.loanBrokerStoreService.existingBrokers();
               const loanBrokerId = this.loanStoreService.loanBrokerId();
               const broker = brokers.find(b => (b.id || b.index) === loanBrokerId);

               if (broker) {
                    // The vault owner is the owner of the LoanBroker
                    const vaultOwnerAddress = broker.owner || broker.Account;

                    // Find the wallet for the vault owner
                    const wallets = this.walletManagerService.wallets();
                    const vaultOwnerWallet = wallets.find(w => w.address === vaultOwnerAddress);

                    if (vaultOwnerWallet) {
                         wallet = vaultOwnerWallet;
                         this.currentWallet.set(vaultOwnerWallet);
                    } else {
                         this.toastService.error("Vault owner wallet not found. Please select the vault owner's wallet.", AppConstants.TOAST.ERROR);
                         return;
                    }
               } else {
                    this.toastService.error('Please select a Loan Broker first.', AppConstants.TOAST.ERROR);
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
                    incudeVaults: true,
                    includeLoanBrokers: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          let result = await this.xrplCacheService.getBrokerInfo(env.client, this.loanStoreService.loanBrokerId());
          this.loanBrokerStoreService.setField('existingBrokers', [result.result.node]);

          result = await this.xrplCacheService.getVaultInfo(env.client, result.result.node.VaultID);
          this.vaultStoreService.setField('existingVaults', [result.result.vault]);

          const assetType = this.loanUtilService.getLoanAssetType();
          this.loanStoreService.setField('assetType', assetType);

          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();
          const mptState = this.mptStoreService.getAll();
          const vault = this.vaultStoreService.getAll();
          const loan = this.loanStoreService.getAll();
          const loanBroker = this.loanBrokerStoreService.getAll();

          // Get counterparty seed from store
          const counterpartySeed = this.loanStoreService.counterpartySeed();
          const paymentAmount = this.loanStoreService.paymentAmount();

          const config: any = {
               account: accountState,
               txOptions: txOptionsState,
               mpt: mptState,
               vault: {
                    ...vault,
                    vaultMetaData: vault.vaultMetaData,
               },
               loan: {
                    ...loan,
                    counterpartySeed: counterpartySeed, // Pass the seed for cosigning
                    paymentAmount: paymentAmount,
               },
               loanBroker: loanBroker,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createLoan':
                              txResult = await this.loanTransactionOrchestratorService.executeLoanTx('createLoan', config);
                              break;
                         case 'payLoan':
                              txResult = await this.loanTransactionOrchestratorService.executeLoanTx('payLoan', config);
                              break;
                         case 'deleteLoan':
                              txResult = await this.loanTransactionOrchestratorService.executeLoanTx('deleteLoan', config);
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

          await this.handleTxResult(txResult, env.client, env.wallet, '', this.mptStoreService.destination(), '', {});
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.mptStoreService.setField('existingMpts', await this.mptUtilService.getMpts(env.accountObjects, env.wallet.classicAddress));

          const loans = await this.loanUtilService.getExistingLoans(env.accountObjects, env.wallet.classicAddress);
          this.loanStoreService.setField('existingLoans', loans);

          const existingBrokers = await this.loanBrokerUtilService.getExistingBrokers(env.accountObjects, env.wallet.classicAddress);
          this.loanBrokerStoreService.setField('existingBrokers', existingBrokers);

          const vaults = await this.vaultUtilService.getExistingVaults(env.accountObjects, env.wallet.classicAddress, 'createVault');
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
               summaryComponent: LoanSummaryComponent,
               summaryInputs: {
                    info: this.loanViewModelService.infoData(),
                    tab: this.loanViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
                    wallet: this.currentWallet(),
                    loanLength: this.loanViewModelService.infoData()?.loanCount ?? 0,
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

     onCanCreateLoanChange(isValid: boolean) {
          this.canCreateLoan.set(isValid);
     }

     onCanPayLoanChange(isValid: boolean) {
          this.canPayLoan.set(isValid);
     }

     onCanDeleteLoanChange(isValid: boolean) {
          this.canDeleteLoan.set(isValid);
     }

     canPerformAction = computed(() => {
          const tab = this.loanViewModelService.activeTab();

          switch (tab) {
               case 'createLoan':
                    return this.canCreateLoan();
               case 'payLoan':
                    return this.canPayLoan();
               case 'deleteLoan':
                    return this.canDeleteLoan();
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
          this.txUiService.disableAdditionalFields();

          // Reset form fields but keep existing vaults
          this.vaultStoreService.setField('amount', '');
          this.vaultStoreService.setField('vaultMetaData', '');
          this.vaultStoreService.setField('selectedVaultId', null);
          this.vaultStoreService.setField('vaultAmount', '');
     }
}
