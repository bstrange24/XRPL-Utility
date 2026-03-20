import { signal, computed, effect, inject } from '@angular/core';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { TransactionDropdownService } from '../transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { Wallet, WalletManagerService } from './manager/wallet-manager.service';
import { CopyUtilService } from '../copy-util/copy-util.service';
import { TxEnvironmentService } from '../transaction-environment/tx-environment.service';
import { WalletDataService } from './refresh-wallet/refresh-wallets.service';
import { ToastService } from '../toast/toast.service';
import { AppConstants } from '../../core/app.constants';
import { AcccountDataService } from '../account-data/acccount-data.service';
import * as xrpl from 'xrpl';
import { ActivatedRoute } from '@angular/router';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';

export abstract class WalletDestinationBase extends PerformanceBaseComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     // Signals
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);
     isAccountDelete = signal<boolean>(false);
     isAccountConfig = signal<boolean>(false);

     // Derived / computed (wallet-related)
     readonly walletName = computed(() => this.currentWallet()?.name || 'Selected wallet');
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());
     // readonly canSubmit = computed(() => this.isIdle());
     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     // Destinations (initialized in constructor)
     allDestinations!: ReturnType<TransactionDropdownService['allDestinations']>;
     destinationMap!: ReturnType<TransactionDropdownService['destinationMap']>;
     destinationItems!: ReturnType<TransactionDropdownService['destinationItems']>;
     selectedDestinationItem!: ReturnType<TransactionDropdownService['selectedDestinationItem']>;
     filteredDestinations!: ReturnType<TransactionDropdownService['filteredDestinations']>;
     destinationDisplay!: ReturnType<TransactionDropdownService['destinationDisplay']>;

     constructor(
          protected readonly walletManager: WalletManagerService,
          protected readonly txUiService: TransactionUiService,
          protected readonly transactionDropdownService: TransactionDropdownService,
          protected readonly walletDataService: WalletDataService,
          protected readonly txEnvironmentService: TxEnvironmentService,
          protected readonly copyUtilService: CopyUtilService,
          protected readonly toastService: ToastService,
          protected readonly acccountDataService: AcccountDataService,
          protected readonly route: ActivatedRoute
     ) {
          super();

          // Initialize all destination-related signals/computed
          this.allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
          this.destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
          this.destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
          this.selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
          this.filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
          this.destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

          // Effects
          effect(() => {
               if (this.walletManager.hasWallets()) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
               }
          });

          effect(() => {
               this.wallets.set(this.walletManager.wallets());
          });

          effect(() => {
               this.walletManager.selectedIndex();
               this.txUiService.clearAllOptionsAndMessages();
               void this.onSelectedWalletIndexChange();
          });
     }

     /** Subclass must implement to refresh credentials or permissioned domains */
     protected abstract refreshAccountObject(env: any): void;

     /** Subclass must implement to clear input fields after a transaction */
     protected abstract clearInputFields(): void;

     /** Optional override in subclass to handle refresh on selected index change */
     protected abstract onSelectedWalletIndexChange(): Promise<void>;

     /** Generic TX / Refresh Helpers */
     protected async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null = null, issuer: string | null = null, errorMessage: string = ''): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          // Only refresh account info and balances if we are not in simulate mode, delete account or account config.
          if (!this.xrplTxOptionsStore.isSimulateEnabled() && !this.isAccountDelete() && !this.isAccountConfig()) {
               await this.refreshAfterTx(client, wallet, destination, issuer);
               this.clearInputFields();
          }

          return true;
     }

     protected async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null = null, issuer: string | null = null): Promise<void> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               forceRefresh: true,
          });

          this.refreshAccountObject(env);

          const addresses = [wallet.classicAddress];
          if (destination) addresses.push(destination);
          if (issuer) addresses.push(issuer);

          await this.refreshWallets(client, addresses);

          this.addCustomDestination(destination ?? issuer);
          this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     }

     protected async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, addresses, (_updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     protected addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     protected trackByWalletAddress(_index: number, wallet: any) {
          return wallet.address;
     }

     protected toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     protected applyTabFromQueryParam<T extends string>(route: ActivatedRoute, allowedTabs: readonly T[], setTab: (tab: T) => void) {
          const tab = route.snapshot.queryParamMap.get('tab');

          if (tab && allowedTabs.includes(tab as T)) {
               setTab(tab as T);
          }
     }
}
