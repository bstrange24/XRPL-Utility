// payment-channel-summary.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { UnifiedPaymentChannel } from '../../constants/payment-channel.types';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { ExpirationFilterInputComponent } from '../../../shared/expiration-filter-input/expiration-filter-input.component';

type SortKey = 'amount' | 'remaining' | 'expiration' | 'id';

@Component({
     selector: 'app-payment-channel-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, FormsModule, SortControlComponent, ExpirationFilterInputComponent],
     templateUrl: './payment-channel-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     infoPanelExpanded = input<boolean>(false);
     info = input<any>();
     tab = input<any>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     paymentChannelSelected = output<UnifiedPaymentChannel>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly expiresAfter = signal<string>('');
     readonly expiresBefore = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'expired' | 'active' | 'claimable'>('all');
     readonly sortBy = signal<SortKey>('remaining');
     readonly sortDirection = signal<'asc' | 'desc'>('desc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'remaining', label: 'Remaining' },
          { key: 'expiration', label: 'Expiration' },
          { key: 'id', label: 'Channel ID' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'active' | 'expired' | 'claimable'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'active', label: 'Active', icon: 'heroClock', color: 'green' },
          { key: 'expired', label: 'Expired', icon: 'heroExclamationCircle', color: 'red' },
          { key: 'claimable', label: 'Claimable', icon: 'heroCurrencyDollar', color: 'purple' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to get expiration timestamp from channel
     private getExpirationTimestamp(channel: UnifiedPaymentChannel): number {
          if (!channel.expiration) return 0;
          const date = new Date(channel.expiration);
          return isNaN(date.getTime()) ? 0 : date.getTime();
     }

     // Computed values
     infoData = computed(() => this.viewModel.infoData());

     totalCount = computed(() => this.infoData()?.channelCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.expiresAfter() || this.expiresBefore() || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted Channels
     filteredChannels = computed(() => {
          let channels = [...(this.infoData()?.channelsToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const after = this.expiresAfter();
          const before = this.expiresBefore();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               channels = channels.filter(ch => ch.id?.toLowerCase().includes(query) || ch.destination?.toLowerCase().includes(query) || ch.sender?.toLowerCase().includes(query) || ch.totalAmount?.toLowerCase().includes(query) || ch.remaining?.toLowerCase().includes(query));
          }

          // Date Range Filter (by expiration)
          if (after || before) {
               channels = channels.filter(ch => {
                    if (!ch.expiration) return false;
                    const expirationDate = new Date(ch.expiration);
                    if (isNaN(expirationDate.getTime())) return false;
                    if (after && expirationDate < new Date(after)) return false;
                    if (before && expirationDate > new Date(before)) return false;
                    return true;
               });
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               channels = channels.filter(ch => {
                    switch (quickFilter) {
                         case 'expired':
                              return ch.isExpired;
                         case 'active':
                              return !ch.isExpired;
                         case 'claimable':
                              return !ch.isExpired && !ch.isOwner && parseFloat(ch.remaining?.split(' ')[0] || '0') > 0;
                         default:
                              return true;
                    }
               });
          }

          return channels;
     });

     sortedChannels = computed(() => {
          let items = [...this.filteredChannels()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'amount':
                         valA = parseFloat(a.totalAmount?.split(' ')[0] || '0');
                         valB = parseFloat(b.totalAmount?.split(' ')[0] || '0');
                         break;
                    case 'remaining':
                         valA = parseFloat(a.remaining?.split(' ')[0] || '0');
                         valB = parseFloat(b.remaining?.split(' ')[0] || '0');
                         break;
                    case 'expiration':
                         valA = this.getExpirationTimestamp(a);
                         valB = this.getExpirationTimestamp(b);
                         break;
                    case 'id':
                         valA = a.id || '';
                         valB = b.id || '';
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedChannels().length);

     emptyStateMessage = computed(() => {
          const info = this.infoData();
          const count = info?.channelCount || 0;
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredChannels().length === 0) {
               return `No channels matching "${query}"`;
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredChannels().length === 0) {
               return `No channels expire in the selected date range`;
          }
          if (quickFilter !== 'all' && this.filteredChannels().length === 0) {
               return `No ${quickFilter} payment channels found`;
          }
          if (count === 0) {
               const tab = this.viewModel.activeTab();
               switch (tab) {
                    case 'claimPaymentChannel':
                         return this.viewModel.infoData()?.isCreatorMode ? 'This wallet has no payment channels to generate signatures for.' : 'This wallet has no payment channels with claimable funds.';
                    case 'renewPaymentChannel':
                         return 'This wallet has no payment channels to renew.';
                    case 'closePaymentChannel':
                         return 'This wallet has no payment channels to close.';
                    case 'fundPaymentChannel':
                         return 'This wallet has no payment channels to fund.';
                    default:
                         return 'This wallet has not created any payment channels.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredChannels().length === 0) {
               return 'Try a different search term';
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredChannels().length === 0) {
               return 'Try adjusting the expiration date range';
          }
          return '';
     });

     // Methods
     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'expired':
                    return `${baseClass} ${isActive ? 'bg-red-100 text-red-700 border-red-200' : 'border-gray-200 text-gray-600 hover:bg-red-50'}`;
               case 'active':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'claimable':
                    return `${baseClass} ${isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-gray-200 text-gray-600 hover:bg-purple-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
          }
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     clearSearch() {
          this.searchQuery.set('');
     }

     setQuickFilter(filter: 'all' | 'expired' | 'active' | 'claimable') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'remaining', 'expiration', 'id'];
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

     onPaymentChannelClick(channel: UnifiedPaymentChannel) {
          this.paymentChannelSelected.emit(channel);
          const currentTab = this.viewModel.activeTab();
          if (currentTab !== 'createPaymentChannel') {
               this.toggleInfoPanel.emit();
          }
     }
}
