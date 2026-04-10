import { signal, computed, effect, inject, untracked } from '@angular/core';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { TransactionDropdownService } from '../transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { Wallet, WalletManagerService } from './manager/wallet-manager.service';
import { CopyUtilService } from '../utils/copy-util/copy-util.service';
import { TxEnvironmentService } from '../transaction-environment/tx-environment.service';
import { WalletDataService } from './refresh-wallet/refresh-wallets.service';
import { ToastService } from '../utils/toast/toast.service';
import { AppConstants } from '../../core/app.constants';
import { AcccountDataService } from '../account-data/acccount-data.service';
import * as xrpl from 'xrpl';
import { ActivatedRoute } from '@angular/router';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';
import { StorageService } from '../shared/local-storage/storage.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { AccountObjectsStoreService } from '../shared/account-objects-store/account-objects-store.service';
import { WalletsUtilService } from './wallets-util/wallets-util.service';

export abstract class WalletDestinationBase extends PerformanceBaseComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     protected readonly xrplCache = inject(XrplCacheService);
     protected readonly sharedObjectsStore = inject(AccountObjectsStoreService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     isSummaryLoading = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);
     isAccountDelete = signal<boolean>(false);
     isAccountConfig = signal<boolean>(false);

     readonly walletName = computed(() => this.currentWallet()?.name || 'Selected wallet');
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());
     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

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
          protected readonly route: ActivatedRoute,
          protected readonly storageService: StorageService
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
               // Use untracked() so that signal reads inside clearAllOptionsAndMessages()
               // (e.g. suppressTxClear, savedTxJson) do NOT create reactive dependencies
               // on this effect. The effect should ONLY re-run when selectedIndex changes —
               // not when suppressTxClear is toggled during a post-tx wallet refresh.
               untracked(() => {
                    this.txUiService.clearAllOptionsAndMessages();
                    void this.onSelectedWalletIndexChange();
               });
          });
     }

     /** Subclass must implement to refresh credentials or permissioned domains */
     protected abstract refreshAccountObject(env: any): void;

     /** Subclass must implement to clear input fields after a transaction */
     protected abstract clearInputFields(): void;

     /** Optional override in subclass to handle refresh on selected index change */
     protected abstract onSelectedWalletIndexChange(): Promise<void>;

     /**
      * Populate the store immediately from in-memory cache (XrplCache or the
      * cross-page AccountObjectsStore) so the summary renders without waiting for
      * the network.  The real fetch still runs and overwrites with fresh data.
      *
      * Call this at the very start of each page's main data-fetch method, before
      * the async `await` begins.
      */
     protected tryPrePopulateFromCache(address: string): void {
          if (!address) return;

          // 1. Try the short-lived XrplCache (valid for up to 15 s after last fetch)
          const cached = this.xrplCache.get<xrpl.AccountObjectsResponse>(`account:${address}:objects`);
          if (cached) {
               this.handleCachedAccountObjects(cached, address);
               return;
          }

          // 2. Fall back to the cross-page shared store (populated by any prior page)
          if (this.sharedObjectsStore.address() === address) {
               const shared = this.sharedObjectsStore.accountObjects();
               if (shared) this.handleCachedAccountObjects(shared, address);
          }
     }

     /**
      * Override in pages whose `refreshAccountObject` only needs `accountObjects`
      * and `wallet.classicAddress` (i.e. all-synchronous implementations).  The
      * default is a no-op; async pages (NFT, Escrow) simply leave it as-is.
      */
     protected handleCachedAccountObjects(_accountObjects: xrpl.AccountObjectsResponse, _address: string): void {
          // no-op by default
     }

     /**
      * Write the freshly-fetched env data to the shared singleton store so that
      * the next page the user visits can pre-populate instantly without a fetch.
      * Call this right after every successful `refreshAccountObject(env)`.
      */
     protected updateSharedObjectsStore(env: any): void {
          if (!env?.accountObjects || !env?.wallet?.classicAddress) return;
          this.sharedObjectsStore.update(env.wallet.classicAddress, env.accountObjects, env.accountInfo ?? null);
     }

     /** Generic TX / Refresh Helpers */
     protected async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null = null, issuer: string | null = null, errorMessage: string = '', extraEnvOptions: any = {}): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          // Only refresh account info and balances if we are not in simulate mode, delete account or account config.
          if (!this.xrplTxOptionsStore.isSimulateEnabled() && !this.isAccountDelete() && !this.isAccountConfig()) {
               await this.refreshAfterTx(client, wallet, destination, issuer, extraEnvOptions);
               this.clearInputFields();
          }

          return true;
     }

     protected async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null = null, issuer: string | null = null, extraEnvOptions: any = {}): Promise<void> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               ...extraEnvOptions,
               forceRefresh: true,
          });

          this.refreshAccountObject(env);
          this.updateSharedObjectsStore(env);
          const addresses = [wallet.classicAddress];
          if (destination) addresses.push(destination);
          if (issuer) addresses.push(issuer);

          // Prevent the wallet-change effect from wiping txSignal/txResultSignal
          // that were just set by the completed transaction.
          this.txUiService.suppressTxClear.set(true);
          try {
               await this.refreshWallets(client, addresses);
          } finally {
               this.txUiService.suppressTxClear.set(false);
          }

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

     // In WalletRemoveCustomWalletComponent
     readonly selectedCustomItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;

          const custom = this.transactionDropdownService.customDestinations().find(d => d.address === addr);

          if (!custom) return null;

          return {
               id: custom.address,
               name: custom.name || this.utilsService.truncateAddress(custom.address),
               address: custom.address,
               // ...
          };
     });

     updateDestinations() {
          const allItems = [
               ...this.walletManager.wallets().map(wallet => ({
                    name: wallet.name ?? this.utilsService.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.transactionDropdownService.customDestinations(),
          ];

          // Deduplicate by address
          const deduped = Array.from(new Map(allItems.map(item => [item.address, item])).values());

          console.log('deduped: ', deduped);

          this.storageService.set('destinations', deduped);
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
