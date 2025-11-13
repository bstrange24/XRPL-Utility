import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Component, ElementRef, ViewChild, ChangeDetectorRef, OnDestroy, AfterViewInit, AfterViewChecked, NgZone, ViewChildren, QueryList } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { UtilsService } from '../../services/util-service/utils.service';
import * as xrpl from 'xrpl';
import { StorageService } from '../../services/local-storage/storage.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { RenderUiComponentsService } from '../../services/render-ui-components/render-ui-components.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core'; // Required for native date adapter

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
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, ScrollingModule, MatProgressSpinnerModule, MatIconModule, MatTooltipModule, MatButtonModule, LucideAngularModule, NgIcon, MatDatepickerModule, MatNativeDateModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './account-changes.component.html',
     styleUrl: './account-changes.component.css',
})
export class AccountChangesComponent implements OnDestroy, AfterViewInit, AfterViewChecked {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
     @ViewChild('resultField') resultField!: ElementRef<HTMLDivElement>;
     @ViewChild(MatSort) sort!: MatSort;
     @ViewChild(MatPaginator) paginator!: MatPaginator;
     selectedAccount: 'account1' | 'account2' | null = 'account1';
     displayedColumns: string[] = ['date', 'hash', 'type', 'change', 'currency', 'fees', 'balanceBefore', 'balanceAfter', 'counterparty'];
     balanceChanges: BalanceChange[] = [];
     balanceChangesDataSource = new MatTableDataSource<BalanceChange>(this.balanceChanges);
     loadingMore: boolean = false;
     hasMoreData: boolean = true;
     marker: any = undefined;
     currentBalance: number = 0;
     currencyBalances: Map<string, number> = new Map();
     lastResult: string = '';
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = false;
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     isMessageKey: boolean = false;
     spinnerMessage: string = '';
     spinner: boolean = false;
     url: string = '';
     filterValue: string = '';
     isExpanded: boolean = false;
     wallets: any[] = [];
     selectedWalletIndex: number = 0;
     currentWallet = { classicAddress: '', address: '', seed: '', name: undefined, balance: '0', ownerCount: undefined, xrpReserves: undefined, spendableXrp: undefined, showSecret: false, isIssuer: false };
     private readonly accountLinesCache = new Map<string, any>();
     private readonly accountLinesCacheTime = new Map<string, number>();
     private readonly transactionCache = new Map<string, any[]>();
     private readonly filterCache = new Map<string, BalanceChange[]>();
     private readonly CACHE_EXPIRY = 30000;
     private scrollDebounce: any = null;
     private hasInitialized = false;
     private loadingInitial = false;
     showSecret: boolean = false;
     environment: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     activeTab = 'balance'; // default
     successMessage: string = '';
     encryptionType: string = '';
     private cachedReserves: any = null;
     hasWallets: boolean = true;
     showToast: boolean = false;
     toastMessage: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;
     // Add to class properties
     dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };
     private searchSubject = new Subject<string>();

     private originalBalanceChanges: BalanceChange[] = []; // Cache full data

     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService, private readonly cdr: ChangeDetectorRef, private readonly storageService: StorageService, private readonly renderUiComponentsService: RenderUiComponentsService, private readonly xrplTransactions: XrplTransactionService, private ngZone: NgZone, private walletGenerator: WalletGeneratorService, private walletManagerService: WalletManagerService) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          this.encryptionType = this.storageService.getInputValue('encryptionType');

          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
          const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
          this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               if (!this.wallets) {
                    this.hasWallets = false;
                    return;
               }
          });

          // Debounce search input
          this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(searchText => {
               this.filterValue = searchText;
               this.applyFilter(searchText);
          });
     }

     ngOnDestroy() {
          if (this.scrollDebounce) {
               clearTimeout(this.scrollDebounce);
          }
     }

     ngAfterViewInit() {
          if (this.hasInitialized) return;
          this.hasInitialized = true;

          this.balanceChangesDataSource.sort = this.sort;
          this.balanceChangesDataSource.paginator = this.paginator;
          (this.balanceChangesDataSource as any).trackByFunction = this.trackByFunction;

          if (this.selectedAccount) {
               this.loadBalanceChanges(true);
          }
     }

     toggleExpanded() {
          this.isExpanded = !this.isExpanded;
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
          this.clearWarning();
     }

     selectWallet(index: number) {
          this.selectedWalletIndex = index;
          this.onAccountChange();
     }

     editName(i: number) {
          this.walletManagerService.startEdit(i);
          const wallet = this.wallets[i];
          this.tempName = wallet.name || `Wallet ${i + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManagerService.saveEdit(this.tempName);
          this.tempName = '';
     }

     cancelEdit() {
          this.walletManagerService.cancelEdit();
          this.tempName = '';
     }

     applyFilter(filterValue: string) {
          const trimmed = filterValue.trim().toLowerCase();
          this.filterValue = trimmed;
          this.balanceChangesDataSource.filter = trimmed; // ← Critical line
     }

     private readonly trackByFunction = (index: number, item: BalanceChange) => {
          return item.hash;
     };

     private setFilterPredicate() {
          this.balanceChangesDataSource.filterPredicate = (data: BalanceChange, filter: string) => {
               const searchText = filter.trim();
               if (!searchText) return this.isInDateRange(data.date);

               // Use pre-computed index
               const matchesText = data._searchIndex?.includes(searchText) ?? false;
               const inDateRange = this.isInDateRange(data.date);

               return matchesText && inDateRange;
          };
     }

     // private setFilterPredicate() {
     //      this.balanceChangesDataSource.filterPredicate = (data: BalanceChange, filter: string) => {
     //           const searchText = filter.toLowerCase().trim();
     //           if (!searchText) return true;

     //           const textMatch = data.type.toLowerCase().includes(searchText) || data.currency.toLowerCase().includes(searchText) || (data.counterparty || '').toLowerCase().includes(searchText) || data.hash.toLowerCase().includes(searchText) || data.change.toString().includes(searchText) || data.fees.toString().includes(searchText) || data.balanceBefore.toString().includes(searchText) || data.balanceAfter.toString().includes(searchText);

     //           const dateStr = this.formatDateForSearch(data.date);
     //           const dateMatch = dateStr.includes(searchText);

     //           const inDateRange = this.isInDateRange(data.date);

     //           return (textMatch || dateMatch) && inDateRange;
     //      };
     // }

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

     applyDateFilter() {
          this.applyFilter(this.filterValue); // Re-apply both filters
     }

     clearDateFilter() {
          this.dateRange = { start: null, end: null };
          this.applyFilter(this.filterValue);
     }

     onPageChange(event: any) {
          const shouldLoadMore = event.pageIndex * event.pageSize >= this.balanceChanges.length;
          if (this.hasMoreData && !this.loadingMore && shouldLoadMore) {
               console.log('Loading more data for page:', event.pageIndex);
               this.loadBalanceChanges(false);
          }
     }

     ngAfterViewChecked() {
          if (this.result !== this.lastResult && this.resultField?.nativeElement) {
               this.renderUiComponentsService.attachSearchListener(this.resultField.nativeElement);
               this.lastResult = this.result;
          }
     }

     onWalletListChange(): void {
          if (this.wallets.length <= 0) {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length === 1 && this.wallets[0].address === '') {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
               this.selectedWalletIndex = 0;
               this.refreshBalance(0);
          } else {
               (async () => {
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [this.wallets[this.selectedWalletIndex].address]);
               })();
          }

          this.onAccountChange();
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
          this.isEditable = !this.isSuccess;
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]);
          } catch (err) {
               this.setError('Failed to refresh balance');
          }
     }

     copyAddress(address: string) {
          navigator.clipboard.writeText(address).then(() => {
               this.showToastMessage('Address copied to clipboard!');
          });
     }

     private showToastMessage(message: string, duration: number = 2000) {
          this.toastMessage = message;
          this.showToast = true;
          setTimeout(() => {
               this.showToast = false;
          }, duration);
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    this.showToastMessage('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    this.showToastMessage('Failed to copy. Please select and copy manually.');
               });
     }

     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.walletManagerService.deleteWallet(index);
               if (this.selectedWalletIndex >= this.wallets.length) {
                    this.selectedWalletIndex = Math.max(0, this.wallets.length - 1);
               }
               this.onAccountChange();
          }
     }

     async generateNewAccount() {
          this.updateSpinnerMessage(``);
          this.showSpinnerWithDelay('Generating new wallet', 5000);
          const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
          const client = await this.xrplService.getClient();
          this.refreshWallets(client, faucetWallet.address);
          this.spinner = false;
          this.clearWarning();
     }

     onAccountChange() {
          if (this.wallets.length === 0) return;
          if (this.selectedWalletIndex < 0 || this.selectedWalletIndex >= this.wallets.length) {
               throw new Error('Selected wallet index out of range');
          }
          this.currentWallet = {
               ...this.wallets[this.selectedWalletIndex],
               balance: this.currentWallet.balance || '0',
          };

          console.log('isValidAddress result:', xrpl.isValidAddress(this.currentWallet.address));
          if (this.currentWallet.address && xrpl.isValidAddress(this.currentWallet.address)) {
               this.loadBalanceChanges(true);
          } else if (this.currentWallet.address) {
               this.setError('Invalid XRP address');
          }
     }

     async loadBalanceChanges(reset = true) {
          // ---- Prevent overlapping loads ----
          if (reset && this.loadingInitial) {
               console.log('loadBalanceChanges skipped (initial load in progress)');
               return;
          }
          if (!reset && this.loadingMore) {
               console.log('loadBalanceChanges skipped (pagination load in progress)');
               return;
          }

          reset ? (this.loadingInitial = true) : (this.loadingMore = true);
          console.log('Entering loadBalanceChanges');
          const startTime = Date.now();

          try {
               const address = this.currentWallet.address;
               if (!address) return;

               const client = await this.xrplService.getClient();

               if (reset) {
                    this.balanceChanges = [];
                    this.balanceChangesDataSource.data = [];
                    this.marker = undefined;
                    this.hasMoreData = true;

                    type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
                    const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
                    this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

                    const [accountInfo, accountLines] = await Promise.all([this.xrplService.getAccountInfo(client, address, 'validated', ''), this.getCachedAccountLines(client, address)]);

                    this.currentBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
                    this.currencyBalances.set('XRP', this.currentBalance);

                    for (const line of accountLines.result.lines) {
                         const key = `${line.currency}+${line.account}`;
                         this.currencyBalances.set(key, Number.parseFloat(line.balance));
                    }

                    const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);
                    this.ownerCount = ownerCount.toString();
                    this.totalXrpReserves = totalXrpReserves;

                    const balance = (await client.getXrpBalance(address)) - Number.parseFloat(totalXrpReserves || '0');
                    this.currentWallet.balance = balance.toString();

                    this.setFilterPredicate();
               }

               if (!this.hasMoreData) {
                    console.log('No more data to load.');
                    return;
               }

               const txResponse = await this.xrplService.getAccountTransactions(client, address, 300, this.marker);

               if (!txResponse.result.transactions || txResponse.result.transactions.length === 0) {
                    this.hasMoreData = false;
                    return;
               }

               console.log(`Total transactions:`, txResponse.result.transactions.length);

               const processedTx = this.processTransactionsForBalanceChanges(txResponse.result.transactions, address);

               this.balanceChanges.push(...processedTx);
               this.originalBalanceChanges = [...this.balanceChanges]; // Cache full
               this.setFilterPredicate();
               this.balanceChangesDataSource.data = [...this.balanceChanges];

               this.marker = txResponse.result.marker;
               if (!this.marker) this.hasMoreData = false;
          } catch (error) {
               console.error('Error loading tx:', error);
               this.setError('Failed to load balance changes');
          } finally {
               if (reset) this.loadingInitial = false;
               else this.loadingMore = false;

               this.cdr.detectChanges();
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving loadBalanceChanges in ${this.executionTime}ms`);
          }
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
               console.debug(`txWrapper`, txWrapper);
               const tx = txWrapper.tx_json || txWrapper.transaction;
               console.debug(`tx`, tx);
               const fee = xrpl.dropsToXrp(tx.Fee).toString();
               const meta = txWrapper.meta;
               const fees = tx.Fee;
               console.debug(`Fee 2`, xrpl.dropsToXrp(fees));

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
                              cp = `${cp.substring(0, 4)}...${cp.substring(cp.length - 4)}`;
                         }

                         changes.push({
                              fees: xrpl.dropsToXrp(fees),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: this.utilsService.roundToEightDecimals(prevXrp),
                              balanceAfter: this.utilsService.roundToEightDecimals(finalXrp),
                         });

                         // ✅ Use this counterparty downstream
                         counterparty = cp;
                    } else if (modified.LedgerEntryType === 'RippleState') {
                         let tokenChange = 0;
                         let tokenCurrency = '';
                         let tokenBalanceBefore = 0;
                         let tokenBalanceAfter = 0;
                         counterparty = modified.FinalFields?.HighLimit?.issuer || modified.FinalFields?.LowLimit?.issuer || counterparty;
                         counterparty = `${counterparty.substring(0, 4)}...${counterparty.substring(counterparty.length - 4)}`;

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
                         // NEW: build once, search fast
                         _searchIndex: [type, changeItem.change, changeItem.currency, xrpl.dropsToXrp(fees), changeItem.balanceBefore, changeItem.balanceAfter, counterparty || '', hash, this.formatDateForSearch(date)].join(' ').toLowerCase(),
                    });
               }
          }

          console.log('Leaving processTransactionsForBalanceChanges');
          return processed;
     }

     onScroll(index: number) {
          if (!this.viewport) {
               console.warn('onScroll: Viewport not initialized');
               return;
          }

          // ---- Prevent new load if one is active ----
          if (this.loadingInitial || this.loadingMore) return;

          const total = this.balanceChangesDataSource.data.length;
          const nearEnd = index >= total - 5 || (total === 0 && this.hasMoreData);

          if (nearEnd && this.hasMoreData) {
               console.log('Triggering load more on scroll');
               if (this.scrollDebounce) clearTimeout(this.scrollDebounce);

               // Debounce to prevent rapid triggers while scrolling
               this.scrollDebounce = setTimeout(() => {
                    if (!this.loadingMore && this.hasMoreData) {
                         this.loadBalanceChanges(false);
                    }
               }, 300);
          }
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

     private async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[]) {
          console.log('Entering refreshWallets');
          const REFRESH_THRESHOLD_MS = 3000;
          const now = Date.now();

          try {
               // Determine which wallets to refresh
               const walletsToUpdate = this.wallets.filter(w => {
                    const needsUpdate = !w.lastUpdated || now - w.lastUpdated > REFRESH_THRESHOLD_MS;
                    const inFilter = addressesToRefresh ? addressesToRefresh.includes(w.classicAddress ?? w.address) : true;
                    return needsUpdate && inFilter;
               });

               if (!walletsToUpdate.length) {
                    console.debug('No wallets need updating.');
                    return;
               }

               console.debug(`Refreshing ${walletsToUpdate.length} wallet(s)...`);

               //Fetch all accountInfo data in parallel (faster, single request per wallet)
               const accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, w.classicAddress ?? w.address, 'validated', '')));

               //Cache reserves (only once per session)
               if (!this.cachedReserves) {
                    this.cachedReserves = await this.utilsService.getXrplReserve(client);
                    console.debug('Cached XRPL reserve data:', this.cachedReserves);
               }

               // Heavy computation outside Angular (no UI reflows)
               this.ngZone.runOutsideAngular(async () => {
                    const updatedWallets = await Promise.all(
                         walletsToUpdate.map(async (wallet, i) => {
                              try {
                                   const accountInfo = accountInfos[i];
                                   const address = wallet.classicAddress ?? wallet.address;

                                   // --- Derive balance directly from accountInfo to avoid extra ledger call ---
                                   const balanceInDrops = String(accountInfo.result.account_data.Balance);
                                   const balanceXrp = xrpl.dropsToXrp(balanceInDrops); // returns string

                                   // --- Get ownerCount + total reserve ---
                                   const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

                                   const spendable = parseFloat(String(balanceXrp)) - parseFloat(String(totalXrpReserves || '0'));

                                   return {
                                        ...wallet,
                                        ownerCount,
                                        xrpReserves: totalXrpReserves,
                                        balance: spendable.toFixed(6),
                                        spendableXrp: spendable.toFixed(6),
                                        lastUpdated: now,
                                   };
                              } catch (err) {
                                   console.error(`Error updating wallet ${wallet.address}:`, err);
                                   return wallet;
                              }
                         })
                    );

                    console.log('updatedWallets', updatedWallets);
                    // Apply updates inside Angular (UI updates + service sync)
                    this.ngZone.run(() => {
                         updatedWallets.forEach(updated => {
                              const idx = this.wallets.findIndex(existing => (existing.classicAddress ?? existing.address) === (updated.classicAddress ?? updated.address));
                              if (idx !== -1) {
                                   this.walletManagerService.updateWallet(idx, updated);
                              }
                         });
                         // Ensure Selected Account Summary refreshes
                         if (this.selectedWalletIndex !== null && this.wallets[this.selectedWalletIndex]) {
                              this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
                         }
                    });
               });
          } catch (error: any) {
               console.error('Error in refreshWallets:', error);
          } finally {
               this.executionTime = (Date.now() - now).toString();
               console.log(`Leaving refreshWallets in ${this.executionTime}ms`);
          }
     }

     copyToClipboard(text: string) {
          navigator.clipboard.writeText(text).then(
               () => {
                    console.log('Copied:', text);
                    this.showToastMessage('Tx Hash copied!');
               },
               err => {
                    this.showToastMessage('Clipboard copy failed:', err);
               }
          );
     }

     private clearMessages() {
          const fadeDuration = 400; // ms
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txResult = [];
          this.paymentTx = [];
          this.successMessage = '';
          this.cdr.detectChanges();
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               send: {
                    message: '',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          // return `The <code>${walletName}</code> wallet has ${dynamicText} ${config.message}`;
          return null;
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.clearMessages();
               this.clearWarning();
          }

          this.cdr.detectChanges();
     }

     private setWarning(msg: string | null) {
          this.warningMessage = msg;
          this.cdr.detectChanges();
     }

     clearWarning() {
          this.setWarning(null);
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     private updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
          this.cdr.detectChanges();
     }

     private setErrorProperties() {
          this.isSuccess = false;
          this.isError = true;
          this.spinner = false;
     }

     private setError(message: string) {
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
     }

     private setSuccessProperties() {
          this.isSuccess = true;
          this.isError = false;
          this.spinner = true;
          this.result = '';
     }

     private setSuccess(message: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
     }
}
