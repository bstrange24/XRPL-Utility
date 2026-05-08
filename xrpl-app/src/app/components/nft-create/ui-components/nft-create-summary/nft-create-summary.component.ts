import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
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

     // Inputs
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     tab = input<NftCreateActionTypes>();

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
                              return nft.transferFee && nft.transferFee > 0;
                         case 'noTransferFee':
                              return !nft.transferFee || nft.transferFee === 0;
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

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'hasUri':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'noUri':
                    return `${baseClass} ${isActive ? 'bg-gray-100 text-gray-700 border-gray-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`;
               case 'hasTransferFee':
                    return `${baseClass} ${isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-gray-200 text-gray-600 hover:bg-purple-50'}`;
               case 'noTransferFee':
                    return `${baseClass} ${isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'border-gray-200 text-gray-600 hover:bg-amber-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
          }
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

     onNftClick(nft: any) {
          this.nftSelected.emit(nft);
          const currentTab = this.nftTransactionViewModelService.activeTab();
          if (currentTab !== 'createNft') {
               this.toggleInfoPanel.emit();
          }
     }
}
