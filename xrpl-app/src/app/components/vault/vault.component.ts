import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { VAULT_TAB_META, VAULT_TABS } from './constants/vault.ui';
import { VAULT_FLAGS_CONFIG, VAULT_TAB } from './constants/vault.constants';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { VaultViewModelService } from '../../services/vault/vault-view-model/vault-view-model.service';
import { VaultCreateComponent } from './tab/vault-create/vault-create.component';
import { VaultActionTypes, VaultConfig } from './constants/vault.types';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { AppConstants } from '../../core/app.constants';
import { EscrowStoreService } from '../../services/escrow/escrow-store/escrow-store.service';
import { VaultTransactionOrchestratorService } from '../../services/vault/vault-transaction-orchestrator/vault-transaction-orchestrator.service';
import { VaultStoreService } from '../../services/vault/vault-store/vault-store.service';
import { VaultUtilService } from '../../services/vault/vault-util/vault-util.service';
import { VaultSummaryComponent } from './ui-components/vault-summary/vault-summary.component';
import { VaultDeleteComponent } from './tab/vault-delete/vault-delete.component';
import { VaultSetComponent } from './tab/vault-set/vault-set.component';
import { VaultClawbackComponent } from './tab/vault-clawback/vault-clawback.component';
import { VaultDepositWithdrawComponent } from './tab/vault-deposit-withdrawl/vault-deposit-withdrawl.component';
import { VaultCacheService } from '../../services/vault/vault-cache/vault-cache.service';
import { MptTransactionViewModelService } from '../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';

@Component({
     selector: 'app-vault',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, VaultCreateComponent, VaultDeleteComponent, VaultSetComponent, VaultClawbackComponent, VaultDepositWithdrawComponent],
     templateUrl: './vault.component.html',
     styleUrl: './vault.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultComponent extends WalletDestinationBase implements OnInit, OnDestroy {
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
     private readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptViewModel = inject(MptTransactionViewModelService);
     private readonly vaultTransactionOrchestratorService = inject(VaultTransactionOrchestratorService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly vaultCacheService = inject(VaultCacheService);

     public readonly tabMeta = VAULT_TAB_META;
     public readonly vaultFlagsConfig = VAULT_FLAGS_CONFIG;
     public canCreateVault = signal(false);
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

     activeTabForRequirements = computed(() => this.vaultViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, VAULT_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(true);
          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance();
          this.mptStoreService.setField('metaData', this.mptStoreService.XLS89_TEMPLATE());

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
          const vaultAction = this.vaultStoreService.vaultAction();
          return VAULT_TABS.map(tab => {
               if (tab.key === 'depositVault') {
                    return {
                         ...tab,
                         label: vaultAction === 'deposit' ? 'Deposit' : 'Withdrawl',
                         icon: vaultAction === 'deposit' ? 'heroArrowDownCircle' : 'heroArrowUpCircle',
                         color: vaultAction === 'deposit' ? '#10b981' : '#60a5fa',
                    };
               }
               return tab;
          });
     });

     public get activeTab() {
          return this.vaultViewModelService.activeTab();
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public onFocus(event: Event) {
          (event.target as HTMLInputElement).select?.();
     }

     public selectedMPT(item: SelectItem | null) {
          const id = item?.id || '';
          this.mptStoreService.setField('mptIssuanceId', id);
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     public mptItems() {
          const mpts = this.mptStoreService.existingMpts?.() || [];
          return this.mptUtilService.computeMptItems(mpts);
     }

     public selectedMptItem() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          return this.mptUtilService.computeSelectedMptItem(this.mptItems(), issuanceId);
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.rightPanelService.resetFilters();
          this.clearInputFields();
          await this.getVaults(true);
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
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
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
          if (!VAULT_TAB.includes(tab as any)) return;
          this.vaultViewModelService.activeTab.set(tab as VaultActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getVaults(false);
     }

     async getVaults(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getVaults', true, async () => {
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
                    const currencyValue = this.currencyStoreService.currency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.currencyStoreService.issuer()) {
                         await this.trustlineUtilService.loadTrustlines(forceRefresh);
                         this.trustlineCurrencyService.selectCurrency(currencyValue);
                    }

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
          let currentTab = this.vaultViewModelService.activeTab();
          const wallet = this.currentWallet();

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeTrustlines: true,
                    includeEscrows: true,
                    incudeVaults: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'depositVault') {
               const selectedVault = this.vaultStoreService.selectedVaultId();
               if (selectedVault) {
                    const allVaults = this.vaultStoreService.existingVaults() || [];
                    const vault = allVaults.find((v: any) => (v.index || v.id) === selectedVault);
                    const asset = vault?.Asset || vault?.SendMax;

                    // Check if depositing MPT
                    if (asset?.mpt_issuance_id) {
                         // Verify the wallet is authorized to hold this MPT
                         const isAuthorized = await this.vaultUtilService.checkMptAuthorization(env.client, asset.mpt_issuance_id, wallet.address);
                         if (!isAuthorized) {
                              this.toastService.error('Cannot deposit MPT: Your wallet is not authorized to hold this MPT. Please authorize it first.', AppConstants.TOAST.ERROR);
                              return;
                         }
                    }
               }
          }

          const escrowState = this.escrowStoreService.getAll();
          const currencyState = this.currencyStoreService.getAll();
          const trustlineState = this.trustlineStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();
          const mptState = this.mptStoreService.getAll();
          const vault = this.vaultStoreService.getAll();

          const config: VaultConfig = {
               escrow: escrowState,
               account: accountState,
               trustline: trustlineState,
               currency: currencyState,
               txOptions: txOptionsState,
               mpt: mptState,
               vault: {
                    ...vault,
                    vaultMetaData: vault.vaultMetaData,
               },
               wallet: wallet,
               preFetchedEnv: env,

               extra: {},
          };

          if (currentTab === 'depositVault') {
               const action = this.vaultStoreService.vaultAction();
               if (action === 'withdraw') {
                    currentTab = 'withdrawlVault';
               }
          }

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('createVault', config);
                              break;
                         case 'modifyVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('modifyVault', config);
                              break;
                         case 'depositVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('depositVault', config);
                              break;
                         case 'withdrawlVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('withdrawlVault', config);
                              break;
                         case 'clawbackVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('clawbackVault', config);
                              break;
                         case 'deleteVault':
                              txResult = await this.vaultTransactionOrchestratorService.executeVaultTx('deleteVault', config);
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
          this.escrowStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));

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

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: VaultSummaryComponent,
               summaryInputs: {
                    info: this.vaultViewModelService.infoData(),
                    tab: this.vaultViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
                    wallet: this.currentWallet(),
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
          this.vaultStoreService.setField('selectedVaultSequence', null);
          this.vaultStoreService.setField('manuallyFetchedVault', null);
          this.vaultStoreService.setField('manualVaultId', null);
     }
}
