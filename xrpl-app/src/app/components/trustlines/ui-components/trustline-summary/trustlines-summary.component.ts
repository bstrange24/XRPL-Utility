import { ChangeDetectionStrategy, Component, inject, computed, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { FormsModule } from '@angular/forms';
import { TrustlineActionTypes } from '../../constants/trustline.types';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';

export interface TrustlineItem {
     currency: string;
     issuer: string;
     limit: string;
     balance: string;
     flags?: string[];
}

export interface TrustlineInfo {
     walletName: string;
     trustlineCount: number;
     trustlinesToShow: TrustlineItem[];
     emptyMessage: string;
     helpHint?: string;
     countText?: string;
}

type SortKey = 'currency' | 'issuer' | 'balance' | 'limit';

@Component({
     selector: 'app-trustlines-summary',
     standalone: true,
     imports: [FormsModule, CommonModule, NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, SortControlComponent],
     templateUrl: './trustlines-summary.component.html',
     styleUrl: './trustlines-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesSummaryComponent {
     private readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     info = input.required<any>();
     tab = input<TrustlineActionTypes>();
     isExpanded = input<boolean>();
     explorerUrl = this.txUiService.explorerUrl;
     wallet = input<{ classicAddress?: string; address?: string } | null>();
     resetTrigger = input<number>(0);

     // Output
     toggleExpanded = output<void>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'positive' | 'negative' | 'zero'>('all');
     readonly sortBy = signal<SortKey>('currency');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'currency', label: 'Currency' },
          { key: 'issuer', label: 'Issuer' },
          { key: 'balance', label: 'Balance' },
          { key: 'limit', label: 'Limit' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'positive' | 'negative' | 'zero'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'positive', label: 'Positive Balance', icon: 'heroArrowUp', color: 'green' },
          { key: 'negative', label: 'Negative Balance', icon: 'heroArrowDown', color: 'red' },
          { key: 'zero', label: 'Zero Balance', icon: 'heroMinus', color: 'gray' },
     ];

     trustlinesWithBalance = computed(() => {
          return this.sortedTrustlines().map(tl => ({
               ...tl,
               balanceNum: parseFloat(tl.balance) || 0,
          }));
     });

     // Computed: Filtered and Sorted Trustlines
     filteredTrustlines = computed(() => {
          let trustlines = this.info()?.trustlinesToShow ?? [];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               trustlines = trustlines.filter((tl: { currency: string; issuer: string; balance: string; limit: string }) => tl.currency.toLowerCase().includes(query) || tl.issuer.toLowerCase().includes(query) || tl.balance.toLowerCase().includes(query) || tl.limit.toLowerCase().includes(query));
          }

          // Quick Filters (by balance)
          if (quickFilter !== 'all') {
               trustlines = trustlines.filter((tl: { balance: string }) => {
                    const balance = parseFloat(tl.balance);
                    switch (quickFilter) {
                         case 'positive':
                              return balance > 0;
                         case 'negative':
                              return balance < 0;
                         case 'zero':
                              return balance === 0;
                         default:
                              return true;
                    }
               });
          }

          return trustlines;
     });

     // Sorted Trustlines
     sortedTrustlines = computed(() => {
          let items = [...this.filteredTrustlines()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'currency':
                         valA = a.currency;
                         valB = b.currency;
                         break;
                    case 'issuer':
                         valA = a.issuer;
                         valB = b.issuer;
                         break;
                    case 'balance':
                         valA = parseFloat(a.balance) || 0;
                         valB = parseFloat(b.balance) || 0;
                         break;
                    case 'limit':
                         valA = parseFloat(a.limit) || 0;
                         valB = parseFloat(b.limit) || 0;
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     summaryText = computed(() => {
          const data = this.info();
          if (!data) return '';
          if (data.isLoading) return ' loading trustlines...';
          if (data.trustlineCount === 0) {
               return data.emptyMessage || 'No trustlines found.';
          }
          return ` has <strong>${data.totalTrustlines}</strong> ${data.countText || 'trustline' + (data.totalTrustlines === 1 ? '' : 's')}.`;
     });

     emptyStateMessage = computed(() => {
          const info = this.info();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (info?.isLoading) return 'Loading trustlines...';
          if (!info) return 'No trustline data available.';
          if (query && this.sortedTrustlines().length === 0) {
               return `No trustlines matching "${query}"`;
          }
          if (quickFilter !== 'all' && this.sortedTrustlines().length === 0) {
               return `No trustlines with ${quickFilter} balance`;
          }
          if (info.trustlineCount === 0) {
               return info.emptyMessage || 'No trustlines found.';
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.sortedTrustlines().length === 0) {
               return 'Try a different search term';
          }
          if (quickFilter !== 'all' && this.sortedTrustlines().length === 0) {
               return 'Try changing the filter or check back later';
          }
          return '';
     });

     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');
     filteredCount = computed(() => this.sortedTrustlines().length);
     totalCount = computed(() => this.info()?.totalTrustlines ?? 0);

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'positive' | 'negative' | 'zero') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['currency', 'issuer', 'balance', 'limit'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.activeQuickFilter.set('all');
     }

     clearSearch() {
          this.searchQuery.set('');
     }

     copyIssuer(issuer: string): void {
          this.copyUtilService.copyAndToast(issuer, 'Issuer Address');
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;

          let colorClass = '';

          switch (filterKey) {
               case 'all':
                    colorClass = 'btn-filter-blue';
                    break;
               case 'positive':
                    colorClass = 'btn-filter-green';
                    break;
               case 'negative':
                    colorClass = 'btn-filter-red';
                    break;
               case 'zero':
                    colorClass = 'btn-filter-gray';
                    break;
               default:
                    colorClass = 'btn-filter-blue';
          }

          // Add active state
          if (isActive) {
               return `${colorClass} btn-filter-active`;
          }

          return colorClass;
     }
}
