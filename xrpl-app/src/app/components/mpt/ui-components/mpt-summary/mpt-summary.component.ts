// mpt-summary.component.ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';

const MPT_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'Multi-Purpose Token',
     itemNamePlural: 'Multi-Purpose Tokens',
     actionMap: {
          createMpt: 'created.',
          authorizeMpt: 'awaiting authorization.',
          unauthorizeMpt: 'that can be unauthorized.',
          sendMpt: 'available to send.',
          lockMpt: 'that can be locked.',
          unlockMpt: 'that can be unlocked.',
          clawbackMpt: 'that can be clawed back.',
          destroyMpt: 'that can be destroyed.',
     },
     defaultAction: 'available.',
};

type SortKey = 'amount' | 'issuanceId' | 'ticker' | 'assetScale';

@Component({
     selector: 'app-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, FormsModule, SortControlComponent],
     templateUrl: './mpt-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     // Inputs
     infoPanelExpanded = input<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();
     mptSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'issued' | 'held' | 'locked'>('all');
     readonly sortBy = signal<SortKey>('issuanceId');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'issuanceId', label: 'Issuance ID' },
          { key: 'ticker', label: 'Ticker' },
          { key: 'assetScale', label: 'Asset Scale' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'issued' | 'held' | 'locked'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'issued', label: 'Issued', icon: 'heroPlusCircle', color: 'green' },
          { key: 'held', label: 'Held', icon: 'heroArrowDown', color: 'amber' },
          { key: 'locked', label: 'Locked', icon: 'heroLockClosed', color: 'red' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to get amount value for sorting
     private getAmountValue(mpt: any): number {
          const amountStr = mpt.formattedAmount || mpt.maxAmount || '0';
          return parseFloat(amountStr.split(' ')[0]) || 0;
     }

     // Computed values
     infoData = computed(() => this.viewModel.infoData());
     totalCount = computed(() => this.infoData()?.mptCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted MPTs
     filteredMpts = computed(() => {
          let mpts = [...(this.infoData()?.mptsToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               mpts = mpts.filter(mpt => mpt.mpt_issuance_id?.toLowerCase().includes(query) || mpt.ticker?.toLowerCase().includes(query) || mpt.formattedAmount?.toLowerCase().includes(query) || mpt.maxAmount?.toLowerCase().includes(query));
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               mpts = mpts.filter(mpt => {
                    switch (quickFilter) {
                         case 'issued':
                              return !mpt.isHolder;
                         case 'held':
                              return mpt.isHolder && parseFloat(mpt.formattedAmount || '0') > 0;
                         case 'locked':
                              return mpt.flags?.includes('Locked') || false;
                         default:
                              return true;
                    }
               });
          }

          return mpts;
     });

     sortedMpts = computed(() => {
          let items = [...this.filteredMpts()];
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
                    case 'issuanceId':
                         valA = a.mpt_issuance_id || '';
                         valB = b.mpt_issuance_id || '';
                         break;
                    case 'ticker':
                         valA = a.ticker || '';
                         valB = b.ticker || '';
                         break;
                    case 'assetScale':
                         valA = parseInt(a.assetScale, 10) || 0;
                         valB = parseInt(b.assetScale, 10) || 0;
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedMpts().length);

     summaryText = computed(() => {
          const info = this.viewModel.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.mptCount, this.viewModel.activeTab(), MPT_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.viewModel.infoData();
          const count = info?.mptCount || 0;
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredMpts().length === 0) {
               return `No MPTs matching "${query}"`;
          }
          if (quickFilter !== 'all' && this.filteredMpts().length === 0) {
               return `No ${quickFilter} MPTs found`;
          }
          if (count === 0) {
               const activeTab = this.viewModel.activeTab();
               switch (activeTab) {
                    case 'createMpt':
                         return 'This wallet has not created any MPTs yet.';
                    case 'authorizeMpt':
                         return 'This wallet has no MPTs to authorize.';
                    case 'unauthorizeMpt':
                         return 'This wallet has no MPTs to unauthorize.';
                    case 'sendMpt':
                         return 'This wallet has no MPTs available to send.';
                    case 'lockMpt':
                         return 'This wallet has no MPTs to lock.';
                    case 'unlockMpt':
                         return 'This wallet has no MPTs to unlock.';
                    case 'clawbackMpt':
                         return 'This wallet has no MPTs to clawback.';
                    case 'destroyMpt':
                         return 'This wallet has no MPTs to destroy.';
                    default:
                         return 'No Multi-Purpose Tokens found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredMpts().length === 0) {
               return 'Try a different search term';
          }
          return '';
     });

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'issued':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'held':
                    return `${baseClass} ${isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'border-gray-200 text-gray-600 hover:bg-amber-50'}`;
               case 'locked':
                    return `${baseClass} ${isActive ? 'bg-red-100 text-red-700 border-red-200' : 'border-gray-200 text-gray-600 hover:bg-red-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
          }
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'issued' | 'held' | 'locked') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'issuanceId', 'ticker', 'assetScale'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.activeQuickFilter.set('all');
     }

     onMptClick(mpt: any) {
          const currentTab = this.viewModel.activeTab();
          if (currentTab === 'createMpt') return;
          this.mptSelected.emit(mpt);
          this.toggleInfoPanel.emit();
     }
}
