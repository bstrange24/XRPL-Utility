// offer-summary.component.ts
import { Component, inject, input, output, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';

type SortKey = 'gets' | 'pays' | 'rate' | 'index';
type QuickFilter = 'all' | 'buy' | 'sell';

@Component({
     selector: 'app-offer-summary',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, SortControlComponent],
     templateUrl: './offer-summary.component.html',
})
export class OfferSummaryComponent {
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly store = inject(OfferStoreService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     readonly infoPanelExpanded = input<boolean>();
     readonly toggleInfoPanel = output<void>();
     readonly info = input<any>();
     readonly tab = input<any>();
     resetTrigger = input<number>(0);

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<QuickFilter>('all');
     readonly sortBy = signal<SortKey>('rate');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'gets', label: 'Taker Gets' },
          { key: 'pays', label: 'Taker Pays' },
          { key: 'rate', label: 'Rate' },
          { key: 'index', label: 'Offer Index' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'buy' | 'sell'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All Offers', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'buy', label: 'Buy Offers', icon: 'heroArrowDown', color: 'green' },
          { key: 'sell', label: 'Sell Offers', icon: 'heroArrowUp', color: 'red' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to calculate rate from takerGets/takerPays
     private calculateRate(offer: any): number {
          const gets = Number.parseFloat(offer.takerGets?.split(' ')[0] || '0');
          const pays = Number.parseFloat(offer.takerPays?.split(' ')[0] || '0');
          if (gets === 0) return 0;
          return pays / gets;
     }

     // Helper function to get amount value for sorting
     private getAmountValue(amount: string): number {
          return Number.parseFloat(amount?.split(' ')[0] || '0');
     }

     // Helper function to determine if offer is buy or sell
     public getOfferType(offer: any): 'buy' | 'sell' {
          // This depends on your data structure - adjust as needed
          // Typically, if the offer is selling XRP for another currency
          const getsCurrency = offer.takerGets?.split(' ')[1] || '';
          const paysCurrency = offer.takerPays?.split(' ')[1] || '';

          // If takerGets is XRP, it's a sell offer (selling XRP)
          if (getsCurrency === 'XRP') return 'sell';
          return 'buy';
     }

     // Computed values
     infoData = computed(() => this.view.infoData());
     totalCount = computed(() => this.infoData()?.offerCount ?? 0);
     isOrderBookTab = computed(() => this.infoData()?.isOrderBookTab ?? false);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted Offers
     filteredOffers = computed(() => {
          let offers = [...(this.infoData()?.offersToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();

          // For order book tab, don't apply filters (show all)
          if (this.isOrderBookTab()) {
               return offers;
          }

          // Text Search
          if (query) {
               offers = offers.filter(offer => offer.index?.toLowerCase().includes(query) || offer.takerGets?.toLowerCase().includes(query) || offer.takerPays?.toLowerCase().includes(query) || offer.issuer?.toLowerCase().includes(query));
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               offers = offers.filter(offer => {
                    const type = this.getOfferType(offer);
                    switch (quickFilter) {
                         case 'buy':
                              return type === 'buy';
                         case 'sell':
                              return type === 'sell';
                         default:
                              return true;
                    }
               });
          }

          return offers;
     });

     sortedOffers = computed(() => {
          let items = [...this.filteredOffers()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'gets':
                         valA = this.getAmountValue(a.takerGets);
                         valB = this.getAmountValue(b.takerGets);
                         break;
                    case 'pays':
                         valA = this.getAmountValue(a.takerPays);
                         valB = this.getAmountValue(b.takerPays);
                         break;
                    case 'rate':
                         valA = this.calculateRate(a);
                         valB = this.calculateRate(b);
                         break;
                    case 'index':
                         valA = a.index || '';
                         valB = b.index || '';
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedOffers().length);

     getSummaryText(info: any): string {
          console.info('info: ', info);
          if (info?.isOrderBookTab) {
               return ` viewing order book for <strong>${info.pair}</strong>`;
          }

          // if (this.filteredCount() === 0 && this.hasActiveFilters()) {
          //      return ` has no offers matching your filters.`;
          // }

          if (info?.offerCount === 0) {
               return ` has no outstanding offers.`;
          }

          return ` has <strong>${info.offerCount}</strong> outstanding offer${info.offerCount === 1 ? '' : 's'}.`;
     }

     getButtonLabel(info: any): string {
          if (info?.isOrderBookTab) {
               return 'order book';
          }
          return `offer${info?.offerCount === 1 ? '' : 's'}`;
     }

     getEmptyStateMessage(): string {
          const activeTab = this.view.activeTab();
          const query = this.searchQuery();

          if (query && this.filteredCount() === 0 && this.totalCount() > 0) {
               return `No offers matching "${query}"`;
          }
          if (this.activeQuickFilter() !== 'all' && this.filteredCount() === 0 && this.totalCount() > 0) {
               return `No ${this.activeQuickFilter()} offers found`;
          }

          if (activeTab === 'createOffer') {
               return 'This wallet has not created any Offers yet.';
          } else if (activeTab === 'cancelOffer') {
               return 'This wallet has no Offers to cancel.';
          }
          return 'No offers found.';
     }

     getEmptyStateSubMessage(): string {
          const query = this.searchQuery();
          if (query && this.filteredCount() === 0 && this.totalCount() > 0) {
               return 'Try a different search term';
          }
          return '';
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'buy':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'sell':
                    return `${baseClass} ${isActive ? 'bg-red-100 text-red-700 border-red-200' : 'border-gray-200 text-gray-600 hover:bg-red-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
          }
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'buy' | 'sell') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['gets', 'pays', 'rate', 'index'];
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

     onOfferClick(offer: any) {
          const activeTab = this.view.activeTab();
          if (activeTab !== 'createOffer') {
               this.toggleInfoPanel.emit();
          }
          console.log('Offer clicked:', offer);
     }
}
