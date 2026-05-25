import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { NgIcon } from '@ng-icons/core';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { NftCreateActionTypes } from '../../constants/nft-create.types';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

const NFT_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'NFT',
     itemNamePlural: 'NFTs',
     actionMap: {
          createNft: 'created.',
          updateNFTMetadata: 'available for update.',
          burnNft: 'available for burning.',
     },
     defaultAction: 'available.',
};

type SortKey = 'id' | 'taxon' | 'sequence' | 'transferFee';

@Component({
     selector: 'app-nft-create-summary',
     standalone: true,
     imports: [TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, NgIcon, SummaryKeyValueComponent, FormsModule, SortControlComponent],
     templateUrl: './nft-create-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftCreateSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly nftTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     tab = input<NftCreateActionTypes>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     nftSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'hasUri' | 'noUri' | 'hasTransferFee' | 'noTransferFee'>('all');
     readonly sortBy = signal<SortKey>('id');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'id', label: 'NFT ID' },
          { key: 'taxon', label: 'Taxon' },
          { key: 'sequence', label: 'Sequence' },
          { key: 'transferFee', label: 'Transfer Fee' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'hasUri' | 'noUri' | 'hasTransferFee' | 'noTransferFee'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'hasUri', label: 'Has URI', icon: 'heroLink', color: 'green' },
          { key: 'noUri', label: 'No URI', icon: 'heroLinkSlash', color: 'gray' },
          { key: 'hasTransferFee', label: 'Has Transfer Fee', icon: 'heroCurrencyDollar', color: 'purple' },
          { key: 'noTransferFee', label: 'No Transfer Fee', icon: 'heroXMark', color: 'amber' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     selectNft(nft: any) {
          const item: SelectItem = {
               id: nft.NFTokenID || nft.id,
               display: nft.URI || nft.uri ? `NFT • ${nft.URI || nft.uri}` : 'NFT',
               secondary: (nft.NFTokenID || nft.id).slice(0, 12) + '...' + (nft.NFTokenID || nft.id).slice(-10),
          };
          this.nftSelected.emit(item); // or emit normalizedNft if you prefer
     }

     // selectNft(nft: any) {
     //      const item: SelectItem = {
     //           id: nft.NFTokenID,
     //           display: nft.URI ? `NFT • ${nft.URI}` : 'NFT',
     //           secondary: nft.NFTokenID.slice(0, 12) + '...' + nft.NFTokenID.slice(-10),
     //      };
     //      this.nftSelected.emit(item);
     // }

     // Helper function to get transfer fee value for sorting
     private getTransferFeeValue(nft: any): number {
          return nft.transferFee ? nft.transferFee / 1000 : 0;
     }

     // Computed values
     infoData = computed(() => this.nftTransactionViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.nftCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted NFTs
     filteredNfts = computed(() => {
          let nfts = [...(this.infoData()?.nftsToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               nfts = nfts.filter(nft => nft.id?.toLowerCase().includes(query) || nft.uri?.toLowerCase().includes(query) || nft.taxon?.toString().toLowerCase().includes(query) || nft.sequence?.toString().toLowerCase().includes(query));
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               nfts = nfts.filter(nft => {
                    switch (quickFilter) {
                         case 'hasUri':
                              return nft.uri && nft.uri !== 'None' && nft.uri !== '';
                         case 'noUri':
                              return !nft.uri || nft.uri === 'None' || nft.uri === '';
                         case 'hasTransferFee':
                              return this.hasTransferFee(nft);
                         case 'noTransferFee':
                              return this.hasNoTransferFee(nft);
                         default:
                              return true;
                    }
               });
          }

          return nfts;
     });

     sortedNfts = computed(() => {
          let items = [...this.filteredNfts()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'id':
                         valA = a.id || '';
                         valB = b.id || '';
                         break;
                    case 'taxon':
                         valA = a.taxon ?? 0;
                         valB = b.taxon ?? 0;
                         break;
                    case 'sequence':
                         valA = a.sequence ?? 0;
                         valB = b.sequence ?? 0;
                         break;
                    case 'transferFee':
                         valA = this.getTransferFeeValue(a);
                         valB = this.getTransferFeeValue(b);
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedNfts().length);

     summaryText = computed(() => {
          const info = this.nftTransactionViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.nftCount, this.nftTransactionViewModelService.activeTab(), NFT_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.nftTransactionViewModelService.infoData();
          const count = info?.nftCount || 0;
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredNfts().length === 0) {
               return `No NFTs matching "${query}"`;
          }
          if (quickFilter !== 'all' && this.filteredNfts().length === 0) {
               return `No NFTs with ${quickFilter.replace(/([A-Z])/g, ' $1').toLowerCase()} found`;
          }
          if (count === 0) {
               const activeTab = this.nftTransactionViewModelService.activeTab();
               switch (activeTab) {
                    case 'createNft':
                         return 'This wallet has not created any NFTs yet.';
                    case 'updateNFTMetadata':
                         return 'This wallet has no NFTs to update.';
                    case 'burnNft':
                         return 'This wallet has no NFTs to burn.';
                    default:
                         return 'No NFTs found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredNfts().length === 0) {
               return 'Try a different search term';
          }
          return '';
     });

     private hasTransferFee(nft: any): boolean {
          if (!nft.transferFee) return false;
          if (nft.transferFee === 'None' || nft.transferFee === 'N/A') return false;
          const fee = Number(nft.transferFee);
          return !isNaN(fee) && fee > 0;
     }

     private hasNoTransferFee(nft: any): boolean {
          if (!nft.transferFee) return true;
          if (nft.transferFee === 'None' || nft.transferFee === 'N/A') return true;
          const fee = Number(nft.transferFee);
          return isNaN(fee) || fee === 0;
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;

          let colorClass = '';

          switch (filterKey) {
               case 'all':
                    colorClass = 'btn-filter-blue';
                    break;
               case 'hasUri':
                    colorClass = 'btn-filter-green';
                    break;
               case 'noUri':
                    colorClass = 'btn-filter-gray';
                    break;
               case 'hasTransferFee':
                    colorClass = 'btn-filter-purple';
                    break;
               case 'noTransferFee':
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

     setQuickFilter(filter: 'all' | 'hasUri' | 'noUri' | 'hasTransferFee' | 'noTransferFee') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['id', 'taxon', 'sequence', 'transferFee'];
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

     onNftClick(nft: any) {
          const normalized = {
               ...nft,
               NFTokenID: nft.id || nft.NFTokenID,
          };

          this.nftSelected.emit(normalized);

          // Force store update directly as backup
          const id = normalized.NFTokenID;
          if (id) {
               this.nftUtilService.onNftSelectedInUi(normalized);
          }

          const currentTab = this.nftTransactionViewModelService.activeTab();
          if (currentTab !== 'createNft') {
               this.toggleInfoPanel.emit();
          }
     }
}
