// nft-offers-summary.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { ExpirationFilterInputComponent } from '../../../shared/expiration-filter-input/expiration-filter-input.component';
import { NftOfferActionTypes } from '../../constants/nft-offers.types';
import { AppConstants } from '../../../../core/app.constants';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';

const NFT_OFFERS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'active NFT offer',
     itemNamePlural: 'active NFT offers',
     actionMap: {
          buyNft: 'created for buying NFTs.',
          sellNft: 'created for selling NFTs.',
          buyNftOffer: 'created for buying NFTs.',
          sellNftOffer: 'created for selling NFTs.',
          cancelNftOffer: 'available to cancel.',
     },
     defaultAction: 'available.',
};

type SortKey = 'amount' | 'counterparty' | 'offerId' | 'expiration';

@Component({
     selector: 'app-nft-offers-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, FormsModule, SortControlComponent, ExpirationFilterInputComponent],
     templateUrl: './nft-offers-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly nftOffersTransactionViewModelService = inject(NftOffersTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly utilsService = inject(UtilsService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     infoPanelExpanded = input<boolean>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     nftSelected = output<any>();
     info = input<string>();
     tab = input<NftOfferActionTypes>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly expiresAfter = signal<string>('');
     readonly expiresBefore = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'expired' | 'active' | 'buy' | 'sell'>('all');
     readonly sortBy = signal<SortKey>('expiration');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'counterparty', label: 'Counterparty' },
          { key: 'offerId', label: 'Offer ID' },
          { key: 'expiration', label: 'Expiration' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'active' | 'expired' | 'buy' | 'sell'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'active', label: 'Active', icon: 'heroClock', color: 'green' },
          { key: 'expired', label: 'Expired', icon: 'heroExclamationCircle', color: 'red' },
          { key: 'buy', label: 'Buy Offers', icon: 'heroArrowDown', color: 'purple' },
          { key: 'sell', label: 'Sell Offers', icon: 'heroArrowUp', color: 'amber' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to get expiration timestamp from XRPL time
     private getExpirationTimestamp(expiration: number | undefined): number {
          if (!expiration) return 0;
          return (expiration + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000;
     }

     // Helper function to get amount value for sorting
     private getAmountValue(offer: any): number {
          const amount = offer.amount;
          if (typeof amount === 'object' && amount !== null && amount.value) {
               return parseFloat(amount.value) || 0;
          }
          if (typeof amount === 'string') {
               return parseFloat(amount) || 0;
          }
          return 0;
     }

     // Helper function to get counterparty for sorting
     private getCounterparty(offer: any): string {
          return offer.counterparty || '';
     }

     // Helper function to get offer type
     private getOfferType(offer: any): 'buy' | 'sell' {
          const tab = offer.tab || this.nftOffersTransactionViewModelService.activeTab();
          return tab === 'buyNft' || tab === 'buyNftOffer' ? 'buy' : 'sell';
     }

     // Computed values
     infoData = computed(() => this.nftOffersTransactionViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.offerCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.expiresAfter() || this.expiresBefore() || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted Offers
     filteredOffers = computed(() => {
          let offers = [...(this.infoData()?.offersToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const after = this.expiresAfter();
          const before = this.expiresBefore();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               offers = offers.filter(offer => offer.index?.toLowerCase().includes(query) || offer.nftId?.toLowerCase().includes(query) || this.getCounterparty(offer).toLowerCase().includes(query) || this.formatAmount(offer.amount).toLowerCase().includes(query));
          }

          // Date Range Filter (by expiration)
          if (after || before) {
               offers = offers.filter(offer => {
                    if (!offer.expiration) return false;
                    const expirationDate = new Date(this.getExpirationTimestamp(offer.expiration));
                    if (isNaN(expirationDate.getTime())) return false;
                    if (after && expirationDate < new Date(after)) return false;
                    if (before && expirationDate > new Date(before)) return false;
                    return true;
               });
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               offers = offers.filter(offer => {
                    switch (quickFilter) {
                         case 'expired':
                              return offer.isExpired;
                         case 'active':
                              return !offer.isExpired;
                         case 'buy':
                              return this.getOfferType(offer) === 'buy';
                         case 'sell':
                              return this.getOfferType(offer) === 'sell';
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
                    case 'amount':
                         valA = this.getAmountValue(a);
                         valB = this.getAmountValue(b);
                         break;
                    case 'counterparty':
                         valA = this.getCounterparty(a);
                         valB = this.getCounterparty(b);
                         break;
                    case 'offerId':
                         valA = a.index || '';
                         valB = b.index || '';
                         break;
                    case 'expiration':
                         valA = this.getExpirationTimestamp(a.expiration);
                         valB = this.getExpirationTimestamp(b.expiration);
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

     summaryText = computed(() => {
          const info = this.nftOffersTransactionViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.offerCount, this.nftOffersTransactionViewModelService.activeTab(), NFT_OFFERS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.nftOffersTransactionViewModelService.infoData();
          const count = info?.offerCount || 0;
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredOffers().length === 0) {
               return `No offers matching "${query}"`;
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredOffers().length === 0) {
               return `No offers expire in the selected date range`;
          }
          if (quickFilter !== 'all' && this.filteredOffers().length === 0) {
               return `No ${quickFilter} offers found`;
          }
          if (count === 0) {
               const activeTab = this.nftOffersTransactionViewModelService.activeTab();
               switch (activeTab) {
                    case 'buyNft':
                    case 'buyNftOffer':
                         return 'This wallet has not created any NFT buy offers.';
                    case 'sellNft':
                    case 'sellNftOffer':
                         return 'This wallet has not created any NFT sell offers.';
                    case 'cancelNftOffer':
                         return 'This wallet has no NFT offers to cancel.';
                    default:
                         return 'No NFT offers found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredOffers().length === 0) {
               return 'Try a different search term';
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredOffers().length === 0) {
               return 'Try adjusting the expiration date range';
          }
          return '';
     });

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;

          let colorClass = '';

          switch (filterKey) {
               case 'all':
                    colorClass = 'btn-filter-blue';
                    break;
               case 'active':
                    colorClass = 'btn-filter-green';
                    break;
               case 'expired':
                    colorClass = 'btn-filter-red';
                    break;
               case 'buy':
                    colorClass = 'btn-filter-purple';
                    break;
               case 'sell':
                    colorClass = 'btn-filter-amber';
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

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'expired' | 'active' | 'buy' | 'sell') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'counterparty', 'offerId', 'expiration'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.expiresAfter.set('');
          this.expiresBefore.set('');
          this.activeQuickFilter.set('all');
     }

     clearSearch() {
          this.searchQuery.set('');
     }

     onNftClick(offer: any) {
          const nftId = offer.nftId || offer.NFTokenID;
          const offerId = offer.index || offer.OfferIndex || offer.id;

          if (nftId) {
               this.nftCreateStoreService.setField('nftId', nftId.trim());
          }
          if (offerId) {
               this.nftCreateStoreService.setField('nftOfferId', offerId.trim());
          }

          this.toggleInfoPanel.emit();
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     formatAmount(amount: any): string {
          if (typeof amount === 'object' && amount !== null && amount.value && amount.currency) {
               const issuerPart = amount.issuer ? ` (Issuer: ${amount.issuer})` : '';
               return `${amount.value} ${amount.currency}${issuerPart}`;
          }
          return `${amount}`;
     }

     isHighlightEnabled = computed(() => {
          const t = this.nftOffersTransactionViewModelService.activeTab();
          return t === 'cancelNftOffer' || t === 'buyNftOffer' || t === 'sellNftOffer';
     });

     selectedOfferIndex = computed(() => this.nftCreateStoreService.nftOfferId() || '');
}
