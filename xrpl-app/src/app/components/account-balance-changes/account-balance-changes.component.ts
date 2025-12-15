import { Component, ElementRef, ViewChild, ChangeDetectorRef, OnDestroy, AfterViewInit, Injector, inject, computed, DestroyRef, signal } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core'; // Required for native date adapter
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as xrpl from 'xrpl';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { Router } from '@angular/router';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';

interface BalanceChange {
     date: Date;
     hash: string;
     type: string;
     change: number;
     fees: number;
     currency: string;
     balanceBefore: number;
     balanceAfter: number;
     counterparty: string;
     _searchIndex?: string;
}

@Component({
     selector: 'app-account-changes',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, ScrollingModule, MatProgressSpinnerModule, MatIconModule, MatTooltipModule, MatButtonModule, LucideAngularModule, NgIcon, MatDatepickerModule, MatNativeDateModule, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './account-balance-changes.component.html',
     styleUrl: './account-balance-changes.component.css',
})
export class AccountChangesComponent extends PerformanceBaseComponent implements OnDestroy, AfterViewInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly walletGenerator = inject(WalletGeneratorService);
     public readonly router = inject(Router);
     public readonly cdr = inject(ChangeDetectorRef);

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     activeTab = signal<'balance'>('balance');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     accountInfo = signal<any>(null);

     private destroy$ = new Subject<void>();
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
     @ViewChild('resultField') resultField!: ElementRef<HTMLDivElement>;
     @ViewChild(MatSort) sort!: MatSort;
     private readonly injector = inject(Injector);
     @ViewChild(MatPaginator) paginator!: MatPaginator;
     displayedColumns: string[] = ['date', 'hash', 'type', 'change', 'currency', 'fees', 'balanceBefore', 'balanceAfter', 'counterparty'];
     balanceChanges: BalanceChange[] = [];
     trackByHash = (index: number, item: BalanceChange) => item.hash;
     loadingMore: boolean = false;
     hasMoreData: boolean = true;
     marker: any = undefined;
     currentBalance: number = 0;
     currencyBalances: Map<string, number> = new Map();
     lastResult: string = '';
     result: string = '';
     // executionTime: string = '';
     isMessageKey: boolean = false;
     url: string = '';
     filterValue: string = '';
     isExpanded: boolean = false;
     selectedWalletIndex: number = 0;
     private readonly accountLinesCache = new Map<string, any>();
     private readonly accountLinesCacheTime = new Map<string, number>();
     private readonly CACHE_EXPIRY = 30000;
     private scrollDebounce: any = null;
     private hasInitialized = false;
     loadingInitial = false;
     ownerCount: string = '';
     xrpReserves: string = '';
     totalXrpReserves: string = '';
     showSecret: boolean = false;
     // environment: string = '';
     successMessage: string = '';
     encryptionType: string = '';
     showToast: boolean = false;
     toastMessage: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;
     dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };
     private searchSubject = new Subject<string>();
     // Replace any old paginator-dependent page size use with this constant
     private readonly PAGE_SIZE = 25;
     // Track seen tx hashes to avoid duplicates when appending
     private readonly seenHashes = new Set<string>();
     private originalBalanceChanges: BalanceChange[] = []; // Cache full data

     onSearchInput(value: string) {
          this.searchSubject.next(value);
     }

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit() {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();

          // Debounce search input
          this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(searchText => {
               this.filterValue = searchText;
               this.applyFilter(searchText);
          });
          console.log('paginator:', this.paginator, 'pageIndex:', this.paginator?.pageIndex, 'pageSize:', this.paginator?.pageSize, 'length:', this.paginator?.length);
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.(); // or just clear messages when appropriate
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearAllOptionsAndMessages();
                    await this.onAccountChange();
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     ngAfterViewInit() {
          if (this.hasInitialized) return;
          this.hasInitialized = true;

          if (this.paginator) {
               console.log('Warning: paginator present but not used for infinite scroll.');
          }
     }

     ngOnDestroy() {
          if (this.scrollDebounce) {
               clearTimeout(this.scrollDebounce);
          }
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleExpanded() {
          this.isExpanded = !this.isExpanded;
     }

     async setTab(tab: 'balance'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          await this.onAccountChange();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async onAccountChange() {
          if (!this.router.url.includes('account-balance-changes')) {
               return;
          }

          this.loadBalanceChanges(true);
     }

     async loadBalanceChanges(reset = true) {
          await this.withPerf('loadBalanceChanges', async () => {
               this.txUiService.clearMessages();

               // Prevent overlapping loads
               if (reset && this.loadingInitial) {
                    console.log('loadBalanceChanges skipped (initial load in progress)');
                    return;
               }
               if (!reset && this.loadingMore) {
                    console.log('loadBalanceChanges skipped (pagination load in progress)');
                    return;
               }

               reset ? (this.loadingInitial = true) : (this.loadingMore = true);

               // Show spinner immediately - use the main spinner, not loadingMore
               this.txUiService.spinner.set(true);
               this.txUiService.spinnerMessage = 'Loading balance changes...';
               const spinnerStartTime = Date.now();
               const minSpinnerTime = 400;

               // If resetting, clear local state and seenHashes
               if (reset) {
                    this.balanceChanges = [];
                    this.originalBalanceChanges = [];
                    // this.balanceChangesDataSource.data = [];
                    this.marker = undefined;
                    this.hasMoreData = true;
                    this.seenHashes.clear();
               }

               console.log('Entering loadBalanceChanges', reset ? '(reset)' : '(load more)');
               const startTime = Date.now();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    // on initial load do some account-level bookkeeping (balances, lines, etc.)
                    if (reset) {
                         const [accountInfo, accountLines] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.getCachedAccountLines(client, wallet.classicAddress)]);

                         this.currentBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
                         this.currencyBalances.set('XRP', this.currentBalance);

                         for (const line of accountLines.result.lines) {
                              const key = `${line.currency}+${line.account}`;
                              this.currencyBalances.set(key, Number.parseFloat(line.balance));
                         }

                         const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, wallet.classicAddress);
                         this.ownerCount = ownerCount.toString();
                         this.totalXrpReserves = totalXrpReserves;

                         const balance = (await client.getXrpBalance(wallet.classicAddress)) - Number.parseFloat(totalXrpReserves || '0');
                         this.currentWallet().balance = balance.toString();

                         // this.setFilterPredicate();
                    }

                    if (!this.hasMoreData) {
                         console.log('No more data to load.');
                         return;
                    }

                    // Use PAGE_SIZE constant. Supply marker for pagination if available
                    const txResponse = await this.xrplService.getAccountTransactions(client, wallet.classicAddress, this.PAGE_SIZE, this.marker);

                    // Defensive checks
                    const txs = txResponse?.result?.transactions ?? [];
                    if (!Array.isArray(txs) || txs.length === 0) {
                         this.hasMoreData = false;
                         console.log('No transactions returned for marker; stopping further loads.');
                         return;
                    }

                    console.log(`Fetched ${txs.length} transactions from XRPL (marker: ${this.marker})`);

                    const processedTx = this.processTransactionsForBalanceChanges(txs, wallet.classicAddress);

                    // Deduplicate by hash to avoid appending same rows repeatedly
                    const newEntries: BalanceChange[] = [];
                    for (const entry of processedTx) {
                         if (!entry || !entry.hash) continue;
                         if (this.seenHashes.has(entry.hash)) {
                              // skip duplicate
                              continue;
                         }
                         this.seenHashes.add(entry.hash);
                         newEntries.push(entry);
                    }

                    if (newEntries.length > 0) {
                         this.balanceChanges.push(...newEntries);
                         this.originalBalanceChanges = [...this.balanceChanges]; // keep full cache

                         // CRITICAL: Trigger array reference change so *cdkVirtualFor sees it
                         this.balanceChanges = [...this.balanceChanges];

                         // Optional: scroll to top on reset
                         if (reset && this.viewport) {
                              setTimeout(() => this.viewport.scrollToIndex(0), 0);
                         }
                    }

                    // Update marker and hasMoreData
                    this.marker = txResponse.result.marker;
                    if (!this.marker) {
                         this.hasMoreData = false;
                         console.log('XRPL returned no marker -> reached end of ledger history for this query.');
                    }
               } catch (error) {
                    console.error('Error loading tx:', error);
                    this.txUiService.setError('Failed to load balance changes');
               } finally {
                    // Calculate remaining time to show spinner (minimum time total)
                    const elapsedSpinnerTime = Date.now() - spinnerStartTime;
                    const remainingSpinnerTime = Math.max(0, minSpinnerTime - elapsedSpinnerTime);

                    console.log(`Spinner shown for ${elapsedSpinnerTime}ms, waiting ${remainingSpinnerTime}ms more`);

                    // Wait for the remaining time before hiding spinner and updating loading flags
                    setTimeout(() => {
                         // Hide spinner and update loading flags together
                         this.txUiService.spinner.set(false);
                         reset ? (this.loadingInitial = false) : (this.loadingMore = false);

                         this.cdr.detectChanges();

                         // this.executionTime = (Date.now() - startTime).toString();
                         // console.log(`Leaving loadBalanceChanges in ${this.executionTime}ms, totalRows=${this.balanceChanges.length}, hasMore=${this.hasMoreData}`);
                    }, remainingSpinnerTime);
               }
               this.updateInfoMessage();
          });
     }

     private async getCachedAccountLines(client: any, address: string): Promise<any> {
          const cacheKey = `${address}-${this.xrplService.getNet().environment}`;
          const now = Date.now();

          const cached = this.accountLinesCache.get(cacheKey);
          const cachedTime = this.accountLinesCacheTime.get(cacheKey);

          if (cached && cachedTime && now - cachedTime < this.CACHE_EXPIRY) {
               return cached;
          }

          const accountLines = await client.request({ command: 'account_lines', account: address });
          this.accountLinesCache.set(cacheKey, accountLines);
          this.accountLinesCacheTime.set(cacheKey, now);
          return accountLines;
     }

     processTransactionsForBalanceChanges(transactions: any[], address: string): BalanceChange[] {
          console.log('Entering processTransactionsForBalanceChanges');

          const processed: BalanceChange[] = [];

          for (const txWrapper of transactions) {
               // console.debug(`txWrapper`, txWrapper);
               const tx = txWrapper.tx_json || txWrapper.transaction;
               // console.debug(`tx`, tx);
               const fee = xrpl.dropsToXrp(tx.Fee).toString();
               const meta = txWrapper.meta;
               const fees = tx.Fee;
               // console.debug(`Fee 2`, xrpl.dropsToXrp(fees));

               if (typeof meta !== 'object' || !meta.AffectedNodes) {
                    continue;
               }

               let type = tx.TransactionType;
               let counterparty = tx.Destination || tx.Account || 'N/A';

               if (tx.TransactionType === 'Payment') {
                    if (tx.Destination === address) {
                         type = 'Payment Received';
                    } else if (tx.Account === address) {
                         type = 'Payment Sent';
                    }
               }

               const changes: { fees: number; change: number; currency: string; balanceBefore: number; balanceAfter: number }[] = [];
               const date = new Date((tx.date + 946684800) * 1000);
               const hash = txWrapper.hash;

               for (const node of meta.AffectedNodes) {
                    const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;
                    if (!modified) continue;

                    if (modified.LedgerEntryType === 'AccountRoot' && modified.FinalFields?.Account === address) {
                         const prevBalanceDrops = modified.PreviousFields?.Balance ?? modified.FinalFields.Balance;
                         const finalBalanceDrops = modified.FinalFields.Balance;

                         const prevXrp = xrpl.dropsToXrp(prevBalanceDrops);
                         const finalXrp = xrpl.dropsToXrp(finalBalanceDrops);
                         const delta = this.utilsService.roundToEightDecimals(finalXrp - prevXrp);

                         // Determine counterparty or source
                         let cp = 'N/A';

                         // Try to detect AMM pool details from meta.AffectedNodes
                         const ammNode = meta.AffectedNodes.find((n: any) => {
                              const node = n.CreatedNode || n.ModifiedNode || n.DeletedNode;
                              return node?.LedgerEntryType === 'AMM';
                         });

                         let ammLabel = '';
                         if (ammNode) {
                              const amm = ammNode.CreatedNode?.NewFields || ammNode.ModifiedNode?.FinalFields;
                              if (amm && amm.Asset && amm.Asset2) {
                                   const curr1 = amm.Asset.currency === 'XRP' ? 'XRP' : this.utilsService.formatCurrencyForDisplay(amm.Asset.currency);
                                   const curr2 = amm.Asset2.currency === 'XRP' ? 'XRP' : this.utilsService.formatCurrencyForDisplay(amm.Asset2.currency);
                                   ammLabel = `AMM Pool (${curr1}/${curr2})`;
                              } else {
                                   ammLabel = 'AMM Pool';
                              }
                         }

                         switch (tx.TransactionType) {
                              // 🔹 Payments
                              case 'Payment':
                                   if (tx.Account === address && tx.Destination) cp = tx.Destination; // Sent to someone
                                   else if (tx.Destination === address && tx.Account) cp = tx.Account; // Received from someone
                                   break;

                              // 🔹 Offers (DEX)
                              case 'OfferCreate':
                              case 'OfferCancel':
                                   cp = 'XRPL DEX';
                                   break;

                              // 🔹 AMM (Automated Market Maker)
                              case 'AMMCreate':
                                   cp = ammLabel || 'AMM Pool (Create)';
                                   break;
                              case 'AMMDeposit':
                                   cp = ammLabel || 'AMM Pool (Deposit)';
                                   break;
                              case 'AMMWithdraw':
                                   cp = ammLabel || 'AMM Pool (Withdraw)';
                                   break;
                              case 'AMMVote':
                                   cp = ammLabel || 'AMM Pool (Vote)';
                                   break;
                              case 'AMMDelete':
                                   cp = ammLabel || 'AMM Pool (Delete)';
                                   break;
                              case 'AMMTrade':
                                   cp = ammLabel || 'AMM Pool (Trade)';
                                   break;

                              // 🔹 Escrows
                              // case 'EscrowCreate':
                              //      cp = tx.Destination || 'Escrow Create';
                              //      break;
                              // case 'EscrowFinish':
                              // case 'EscrowCancel':
                              //      cp = 'Escrow';
                              //      break;

                              //🔹 Checks
                              // case 'CheckCreate':
                              //      cp = tx.Destination || 'Check Created';
                              //      break;
                              // case 'CheckCash':
                              // case 'CheckCancel':
                              //      cp = 'Check';
                              //      break;

                              // 🔹 Payment Channels
                              // case 'PaymentChannelCreate':
                              //      cp = tx.Destination || 'Payment Channel Create';
                              //      break;
                              // case 'PaymentChannelClaim':
                              // case 'PaymentChannelFund':
                              //      cp = 'Payment Channel';
                              //      break;

                              // 🔹 NFTs
                              case 'NFTokenMint':
                                   cp = 'NFT Mint';
                                   break;
                              case 'NFTokenBurn':
                                   cp = 'NFT Burn';
                                   break;
                              case 'NFTokenAcceptOffer':
                              case 'NFTokenCancelOffer':
                              case 'NFTokenCreateOffer':
                                   cp = 'NFT Offer';
                                   break;

                              // 🔹 Multi-sign, account config
                              case 'SignerListSet':
                                   cp = 'Signer List';
                                   break;
                              case 'SetRegularKey':
                                   cp = 'Regular Key';
                                   break;
                              case 'AccountSet':
                                   cp = 'Account Settings';
                                   break;
                              case 'DepositPreauth':
                                   cp = 'Deposit Auth';
                                   break;

                              // 🔹 Hooks, DIDs, Credentials
                              case 'SetHook':
                                   cp = 'Hook';
                                   break;
                              case 'DIDSet':
                                   cp = 'DID Update';
                                   break;
                              // case 'CredentialCreate':
                              // case 'CredentialAccept':
                              //      cp = 'Credential';
                              //      break;

                              // 🔹 Trustlines
                              // case 'TrustSet':
                              //      cp = 'Trustline';
                              //      break;

                              // 🔹 Tickets
                              case 'TicketCreate':
                                   cp = 'Ticket';
                                   break;

                              // 🔹 Fallback
                              default:
                                   cp = tx.Destination || tx.Account || 'XRPL Ledger';
                                   break;
                         }

                         // Shorten address form for UI readability
                         if (cp && cp !== 'N/A' && cp.length > 12 && !cp.includes('(')) {
                              cp = `${cp.substring(0, 6)}...${cp.substring(cp.length - 6)}`;
                         }

                         changes.push({
                              fees: xrpl.dropsToXrp(fees),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: this.utilsService.roundToEightDecimals(prevXrp),
                              balanceAfter: this.utilsService.roundToEightDecimals(finalXrp),
                         });

                         // Use this counterparty downstream
                         counterparty = cp;
                    } else if (modified.LedgerEntryType === 'RippleState') {
                         let tokenChange = 0;
                         let tokenCurrency = '';
                         let tokenBalanceBefore = 0;
                         let tokenBalanceAfter = 0;
                         counterparty = modified.FinalFields?.HighLimit?.issuer || modified.FinalFields?.LowLimit?.issuer || counterparty;
                         counterparty = `${counterparty.substring(0, 6)}...${counterparty.substring(counterparty.length - 6)}`;

                         if (node.DeletedNode) {
                              const balanceField = modified.FinalFields?.Balance;
                              if (balanceField) {
                                   tokenChange = this.utilsService.roundToEightDecimals(-Number.parseFloat(balanceField.value));
                                   tokenBalanceBefore = this.utilsService.roundToEightDecimals(Number.parseFloat(balanceField.value));
                                   tokenBalanceAfter = 0;
                                   const curr = balanceField.currency.length > 3 ? this.utilsService.formatCurrencyForDisplay(balanceField.currency).slice(0, 8) : balanceField.currency || '';
                                   tokenCurrency = curr;
                              }
                         } else if (modified.FinalFields?.Balance) {
                              const balanceField = modified.FinalFields.Balance;
                              const prevBalanceField = modified.PreviousFields?.Balance || { value: '0' };
                              tokenChange = this.utilsService.roundToEightDecimals(Number.parseFloat(balanceField.value) - Number.parseFloat(prevBalanceField.value));
                              tokenBalanceBefore = this.utilsService.roundToEightDecimals(Number.parseFloat(prevBalanceField.value));
                              tokenBalanceAfter = this.utilsService.roundToEightDecimals(Number.parseFloat(balanceField.value));
                              const curr = balanceField.currency.length > 3 ? this.utilsService.formatCurrencyForDisplay(balanceField.currency).slice(0, 8) : balanceField.currency || '';
                              tokenCurrency = curr;
                         } else if (modified.NewFields?.Balance) {
                              const balanceField = modified.NewFields.Balance;
                              tokenChange = this.utilsService.roundToEightDecimals(Number.parseFloat(balanceField.value));
                              tokenBalanceBefore = 0;
                              tokenBalanceAfter = this.utilsService.roundToEightDecimals(Number.parseFloat(balanceField.value));
                              const curr = balanceField.currency.length > 3 ? this.utilsService.formatCurrencyForDisplay(balanceField.currency).slice(0, 8) : balanceField.currency || '';
                              tokenCurrency = curr;
                         }

                         if (tokenCurrency && tokenChange !== 0) {
                              changes.push({
                                   fees: xrpl.dropsToXrp(fees),
                                   change: tokenChange,
                                   currency: tokenCurrency,
                                   balanceBefore: tokenBalanceBefore,
                                   balanceAfter: tokenBalanceAfter,
                              });
                         }
                    }
               }

               for (const changeItem of changes) {
                    processed.push({
                         date,
                         hash,
                         type,
                         fees: xrpl.dropsToXrp(fees),
                         change: changeItem.change,
                         currency: changeItem.currency,
                         balanceBefore: changeItem.balanceBefore,
                         balanceAfter: changeItem.balanceAfter,
                         counterparty,
                         _searchIndex: [type, changeItem.change, changeItem.currency, xrpl.dropsToXrp(fees), changeItem.balanceBefore, changeItem.balanceAfter, counterparty || '', hash, this.formatDateForSearch(date)].join(' ').toLowerCase(),
                    });
               }
          }

          console.log('Leaving processTransactionsForBalanceChanges');
          return processed;
     }

     private formatDateForSearch(date: Date): string {
          const d = new Date(date);
          const month = d.toLocaleString('default', { month: 'short' });
          const day = d.getDate();
          const year = d.getFullYear();
          return `${month} ${day}, ${year} ${year} ${day} ${month}`.toLowerCase();
     }

     private isInDateRange(date: Date): boolean {
          if (!this.dateRange.start && !this.dateRange.end) return true;
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);

          if (this.dateRange.start) {
               const start = new Date(this.dateRange.start);
               start.setHours(0, 0, 0, 0);
               if (d < start) return false;
          }
          if (this.dateRange.end) {
               const end = new Date(this.dateRange.end);
               end.setHours(23, 59, 59, 999);
               if (d > end) return false;
          }
          return true;
     }

     clearFilter() {
          this.filterValue = '';
          this.applyFilter('');
     }

     applyDateFilter() {
          this.applyFilter(this.filterValue); // Re-apply both filters
     }

     clearDateFilter() {
          this.dateRange = { start: null, end: null };
          this.applyFilter(this.filterValue);
     }

     onPageChange(event: PageEvent) {
          const { pageIndex, pageSize } = event;
          const totalLoaded = this.balanceChanges.length;

          // Calculate how many items this page would require
          const requiredCount = (pageIndex + 1) * pageSize;

          // Only load if we don't already have enough items
          if (requiredCount > totalLoaded && this.hasMoreData && !this.loadingMore) {
               console.log('Paginator requested more data for page', pageIndex);
               this.loadBalanceChanges(false);
          }
     }

     onScroll(event: any) {
          if (this.loadingMore || !this.hasMoreData) return;

          const element = event.target;
          const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 200;

          if (atBottom) {
               clearTimeout(this.scrollDebounce);
               this.scrollDebounce = setTimeout(() => {
                    this.loadBalanceChanges(false);
               }, 100);
          }
     }

     applyFilter(filterValue: string) {
          const trimmed = (filterValue || '').trim().toLowerCase();
          this.filterValue = trimmed;

          if (!trimmed && !this.dateRange.start && !this.dateRange.end) {
               this.balanceChanges = [...this.originalBalanceChanges];
          } else {
               this.balanceChanges = this.originalBalanceChanges.filter(item => {
                    const matchesText = !trimmed || (item._searchIndex?.includes(trimmed) ?? false);
                    const inDateRange = this.isInDateRange(item.date);
                    return matchesText && inDateRange;
               });
          }

          // Scroll to top on filter
          this.viewport?.scrollToIndex(0);
          this.cdr.detectChanges();
     }

     getTypeColor(type: string): string {
          switch (type) {
               case 'Payment':
               case 'Payment Sent':
               case 'Payment Received':
                    return '#8BE684';

               case 'PermissionedDomainSet':
               case 'PermissionedDomainDelete':
               case 'CredentialCreate':
               case 'CredentialAccept':
               case 'DepositPreauth':
               case 'EscrowFinish':
               case 'EscrowCreate':
               case 'EscrowCancel':
               case 'MPTokenIssuanceCreate':
               case 'MPTokenIssuanceSet':
               case 'NFTokenBurn':
               case 'PaymentChannelClaim':
               case 'PaymentChannelCreate':
               case 'AMMDelete':
               case 'CredentialDelete':
                    return '#f0874bff';

               case 'TicketCreate':
               case 'Batch':

               case 'TrustSet':
               case 'MPTokenAuthorize':
               case 'AMMWithdraw':
               case 'AMMCreate':
               case 'AMMDeposit':
               case 'Clawback':
                    return '#79BDD8';

               case 'SignerListSet':
               case 'DIDSet':
               case 'DIDDelete':
               case 'AccountSet':
               case 'AccountDelete':
               case 'SetRegularKey':
               case 'MPTokenIssuanceDestroy':
                    return '#BAD47B';

               case 'NFTokenMint':
               case 'NFTokenModify':
               case 'NFTokenCancelOffer':
               case 'NFTokenCreateOffer':
               case 'NFTokenAcceptOffer':
                    return '#ac7bd4ff';

               case 'CheckCancel':
               case 'CheckCash':
               case 'CheckCreate':
                    return '#9bc5a2ff';

               case 'OfferCreate':
               case 'OfferCancel':
                    return '#9bc5a2ff';
               default:
                    return 'white'; // fallback color
          }
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     copyToClipboard(text: string) {
          navigator.clipboard.writeText(text).then(
               () => {
                    console.log('Copied:', text);
                    this.txUiService.showToastMessage('Tx Hash copied!');
               },
               err => {
                    this.txUiService.showToastMessage('Clipboard copy failed:', err);
               }
          );
     }

     updateInfoMessage(): void {
          if (!this.currentWallet()?.address) {
               this.txUiService.setInfoMessage('No wallet is currently selected.');
               return;
          }

          const walletName = this.currentWallet().name || 'selected';

          if (!this.currentBalance && this.balanceChanges.length === 0) {
               this.txUiService.setInfoMessage(`<code>${walletName}</code> wallet has no balance change history available.`);
               return;
          }

          let messageParts: string[] = [];

          // // Add balance information
          // if (this.currentBalance !== undefined) {
          //      const formattedBalance = this.utilsService.roundToEightDecimals(this.currentBalance);
          //      messageParts.push(`Current XRP balance: <strong>${formattedBalance} XRP</strong>`);
          // }

          // // Add balance change summary
          if (this.balanceChanges.length > 0) {
               const totalTransactions = this.balanceChanges.length;
               messageParts.push(`${totalTransactions} balance change${totalTransactions === 1 ? '' : 's'} displayed`);
          }

          // // Add additional balance information if available
          // if (this.ownerCount !== undefined && this.ownerCount !== '') {
          //      messageParts.push(`Owner count: <strong>${this.ownerCount}</strong>`);
          // }

          // if (this.totalXrpReserves !== undefined && this.totalXrpReserves !== '') {
          //      const spendableBalance = parseFloat(this.currentWallet.balance || '0');
          //      messageParts.push(`Total XRP reserves: <strong>${this.totalXrpReserves}</strong>`);

          //      if (spendableBalance >= 0) {
          //           messageParts.push(`Spendable balance: <strong>${spendableBalance.toFixed(6)} XRP</strong>`);
          //      }
          // }

          let message: string;
          if (messageParts.length === 0) {
               message = `<code>${walletName}</code> wallet has no balance information available.`;
          } else {
               message = `<code>${walletName}</code> wallet balance information:<ul>`;
               messageParts.forEach(part => {
                    message += `<li>${part}</li>`;
               });
               message += '</ul>';
          }

          // Add information about what is displayed
          if (this.balanceChanges.length > 0) {
               message += "The balance changes table shows all transactions that affected this account's XRP balance and issued currency balances, including:<ul>";
               message += '<li>Payments sent and received</li>';
               message += '<li>Trust line balance changes</li>';
               message += '<li>Automated Market Maker (AMM) deposit, withdrawal, and trade activity</li>';
               message += '<li>Offer creation and cancellation affecting account balances</li>';
               message += '<li>Other transactions that modify account balances, etc...</li>';
               message += '</ul>';
          }

          this.txUiService.setInfoMessage(message);
     }

     clearFields() {
          this.clearDateFilter();
          this.clearFilter();
          this.txUiService.clearMessages();
          this.clearWarning();
          this.cdr.detectChanges();
     }

     clearWarning() {
          this.txUiService.setWarning(null);
     }
}
