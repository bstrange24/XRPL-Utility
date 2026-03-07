import { Component, ViewChild, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { NavbarComponent } from '../navbar/navbar.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { AppConstants } from '../../core/app.constants';

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
     templateUrl: './account-balance-changes.component.html',
     styleUrl: './account-balance-changes.component.css',
})
export class AccountChangesComponent extends PerformanceBaseComponent implements OnInit {
     private readonly utilsService = inject(UtilsService);
     public readonly walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly xrplTransactions = inject(XrplTransactionService);
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly copyUtilService = inject(CopyUtilService);

     @ViewChild(CdkVirtualScrollViewport)
     viewport!: CdkVirtualScrollViewport;

     originalBalanceChanges = signal<BalanceChange[]>([]);
     loadingInitial = signal(false);
     loadingMore = signal(false);
     hasMoreData = signal(true);
     filterValue = signal('');
     dateRange = signal<{ start: Date | null; end: Date | null }>({
          start: null,
          end: null,
     });

     private readonly PAGE_SIZE = 25;
     private readonly seenHashes = new Set<string>();
     private marker: any = undefined;
     private searchTimer: any;
     currentWallet = signal<Wallet>({} as Wallet);
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     ngOnInit() {
          this.loadBalanceChanges(true);
     }

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     filteredBalanceChanges = computed(() => {
          const data = this.originalBalanceChanges();
          const text = this.filterValue();
          const { start, end } = this.dateRange();

          return data.filter(item => {
               const result = this.isInDateRange(item.date, start, end);
               return (!text || item._searchIndex?.includes(text)) && result;
          });
     });

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);
          this.loadBalanceChanges(true);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     readonly infoData = computed(() => {
          const wallet = this.walletManager.getSelectedWallet();
          const txs = this.filteredBalanceChanges();

          if (!wallet?.address) {
               return `No wallet selected.`;
          }

          const walletName = wallet.name || 'Selected wallet';

          if (txs.length === 0) {
               return `<code>${walletName}</code> has no recorded balance changes yet.`;
          }

          const spendable = Number(wallet.balance || 0).toFixed(6);

          return `<code>${walletName}</code> wallet has <strong class="object-count">${spendable} XRP</strong> available for sending. <br><strong>${txs.length}</strong> balance changes loaded.`;
     });

     onSearchInput(value: string) {
          clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => {
               this.filterValue.set(value.trim().toLowerCase());
          }, 300);
     }

     clearFilter() {
          this.filterValue.set('');
     }

     clearDateFilter() {
          this.dateRange.set({ start: null, end: null });
     }

     onScroll(event: any) {
          if (this.loadingMore() || !this.hasMoreData()) return;

          const el = event.target;
          const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 200;

          if (atBottom) {
               this.loadBalanceChanges(false);
          }
     }

     async loadBalanceChanges(reset = true) {
          if (reset && this.loadingInitial()) return;
          if (!reset && this.loadingMore()) return;

          reset ? this.loadingInitial.set(true) : this.loadingMore.set(true);

          if (reset) {
               this.originalBalanceChanges.set([]);
               this.marker = undefined;
               this.hasMoreData.set(true);
               this.seenHashes.clear();
          }

          try {
               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeTrustlines: false,
                    forceRefresh: true,
               });

               if (!this.hasMoreData()) return;

               const txResponse = await this.xrplService.getAccountTransactions(env.client, env.wallet.classicAddress, this.PAGE_SIZE, this.marker);

               const txs = txResponse?.result?.transactions ?? [];

               if (!txs.length) {
                    this.hasMoreData.set(false);
                    return;
               }

               const processed = this.processTransactionsForBalanceChanges(txs, env.wallet.classicAddress);

               const newEntries: BalanceChange[] = [];

               for (const entry of processed) {
                    if (!this.seenHashes.has(entry.hash)) {
                         this.seenHashes.add(entry.hash);
                         newEntries.push(entry);
                    }
               }

               if (newEntries.length) {
                    this.originalBalanceChanges.update(prev => [...prev, ...newEntries]);
               }

               this.marker = txResponse.result.marker;

               if (!this.marker) {
                    this.hasMoreData.set(false);
               }
          } catch (err) {
               console.error(err);
               this.txUiService.setError('Failed to load balance changes.');
          } finally {
               reset ? this.loadingInitial.set(false) : this.loadingMore.set(false);
          }
     }

     processTransactionsForBalanceChanges(transactions: any[], address: string): BalanceChange[] {
          const processed: BalanceChange[] = [];

          for (const txWrapper of transactions) {
               const tx = txWrapper.tx_json || txWrapper.transaction;
               const meta = txWrapper.meta;
               if (!meta?.AffectedNodes) continue;

               // Create date in UTC to avoid timezone issues
               const timestamp = (tx.date + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000;
               const date = new Date(timestamp);

               // Store as UTC midnight for consistent comparison
               const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

               const hash = txWrapper.hash;
               const feeXrp = xrpl.dropsToXrp(tx.Fee);
               let type = tx.TransactionType;
               let counterparty = tx.Destination || tx.Account || 'XRPL';

               for (const node of meta.AffectedNodes) {
                    const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;

                    if (!modified) continue;

                    if (modified.LedgerEntryType === 'AccountRoot' && modified.FinalFields?.Account === address) {
                         const prev = modified.PreviousFields?.Balance ?? modified.FinalFields.Balance;
                         const final = modified.FinalFields.Balance;

                         const prevXrp = xrpl.dropsToXrp(prev);
                         const finalXrp = xrpl.dropsToXrp(final);

                         const delta = this.utilsService.roundToEightDecimals(finalXrp - prevXrp);

                         processed.push({
                              date: utcDate, // Store UTC-normalized date
                              hash,
                              type,
                              fees: Number(feeXrp),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: prevXrp,
                              balanceAfter: finalXrp,
                              counterparty,
                              _searchIndex: `${type} ${delta} XRP ${hash}`.toLowerCase(),
                         });
                    }
               }
          }

          return processed;
     }

     processTransactionsForBalanceChanges1(transactions: any[], address: string): BalanceChange[] {
          const processed: BalanceChange[] = [];

          for (const txWrapper of transactions) {
               const tx = txWrapper.tx_json || txWrapper.transaction;
               const meta = txWrapper.meta;
               if (!meta?.AffectedNodes) continue;

               const date = new Date((tx.date + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000);
               const hash = txWrapper.hash;

               const feeXrp = xrpl.dropsToXrp(tx.Fee);
               let type = tx.TransactionType;
               let counterparty = tx.Destination || tx.Account || 'XRPL';

               for (const node of meta.AffectedNodes) {
                    const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;

                    if (!modified) continue;

                    if (modified.LedgerEntryType === 'AccountRoot' && modified.FinalFields?.Account === address) {
                         const prev = modified.PreviousFields?.Balance ?? modified.FinalFields.Balance;

                         const final = modified.FinalFields.Balance;

                         const prevXrp = xrpl.dropsToXrp(prev);
                         const finalXrp = xrpl.dropsToXrp(final);

                         const delta = this.utilsService.roundToEightDecimals(finalXrp - prevXrp);

                         processed.push({
                              date,
                              hash,
                              type,
                              fees: Number(feeXrp),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: prevXrp,
                              balanceAfter: finalXrp,
                              counterparty,
                              _searchIndex: `${type} ${delta} XRP ${hash}`.toLowerCase(),
                         });
                    }
               }
          }

          return processed;
     }

     trackByHash = (_: number, item: BalanceChange) => item.hash;

     copyToClipboard(text: string) {
          this.copyUtilService.copyTxHash(text);
     }

     getTypeColor(type: string): string {
          switch (type) {
               case 'Payment':
               case 'Payment Sent':
               case 'Payment Received':
                    return '#8BE684';

               case 'PermissionedDomainSet':
               case 'PDomainSet':
               case 'PDomainDelete':
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

     setStartDate(value: string | null) {
          if (!value) {
               this.dateRange.set({ ...this.dateRange(), start: null });
               return;
          }

          // Create UTC date at start of day
          const [year, month, day] = value.split('-').map(Number);
          const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

          this.dateRange.set({
               ...this.dateRange(),
               start,
          });
     }

     setEndDate(value: string | null) {
          if (!value) {
               this.dateRange.set({ ...this.dateRange(), end: null });
               return;
          }

          // Create UTC date at end of day
          const [year, month, day] = value.split('-').map(Number);
          const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

          this.dateRange.set({
               ...this.dateRange(),
               end,
          });
     }

     private isInDateRange(date: Date, start: Date | null, end: Date | null): boolean {
          const txTime = new Date(date).getTime();

          if (start) if (txTime < start.getTime()) return false;

          if (end) if (txTime > end.getTime()) return false;

          return true;
     }
}
