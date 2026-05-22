import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowCreateItemComponent } from '../../tab/escrow-create-item/escrow-create-item.component';
import { EscrowCancelItemComponent } from '../../tab/escrow-cancel-item/escrow-cancel-item.component';
import { EscrowFinishItemComponent } from '../../tab/escrow-finish-item/escrow-finish-item.component';
import { AnyEscrowDisplayItem, EscrowActionTypes } from '../../constants/time-escrow.types';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { ExpirationFilterInputComponent } from '../../../shared/expiration-filter-input/expiration-filter-input.component';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';

const ESCROW_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'escrow',
     itemNamePlural: 'escrows',
     actionMap: {
          createEscrow: 'created.',
          finishEscrow: 'that can be finished.',
          cancelEscrow: 'that can be cancelled.',
     },
};

type SortKey = 'amount' | 'party' | 'sequence' | 'expiration';

@Component({
     selector: 'app-escrow-summary',
     standalone: true,
     imports: [EscrowCreateItemComponent, EscrowCancelItemComponent, EscrowFinishItemComponent, NgIcon, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, FormsModule, SortControlComponent, ExpirationFilterInputComponent],
     templateUrl: './escrow-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     wallet = input.required<{ address: string } | null | undefined>();
     escrowLength = input.required<number>();
     tab = input.required<EscrowActionTypes>();
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     escrowSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly expiresAfter = signal<string>('');
     readonly expiresBefore = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'expired' | 'active' | 'pending'>('all');
     readonly sortBy = signal<SortKey>('expiration');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'party', label: 'Destination/Sender' },
          { key: 'sequence', label: 'Sequence' },
          { key: 'expiration', label: 'Expiration' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'active' | 'expired' | 'pending'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'active', label: 'Active', icon: 'heroClock', color: 'green' },
          { key: 'expired', label: 'Expired', icon: 'heroExclamationCircle', color: 'red' },
          { key: 'pending', label: 'Pending', icon: 'heroClock', color: 'amber' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to get party (destination or sender) from escrow
     private getParty(escrow: AnyEscrowDisplayItem): string {
          if (escrow.tab === 'finishEscrow') {
               return (escrow as any).sender || '';
          }
          return (escrow as any).destination || '';
     }

     // Helper function to get expiration timestamp
     private getExpirationTimestamp(escrow: AnyEscrowDisplayItem): number {
          const expirationValue = escrow.cancelAfter || escrow.finishAfter;
          if (!expirationValue) return 0;

          // Convert from Ripple time (seconds since 2000-01-01) to JS timestamp
          return (expirationValue + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000;
     }

     // Computed values
     infoData = computed(() => this.escrowTransactionViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.escrowCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.expiresAfter() || this.expiresBefore() || this.activeQuickFilter() !== 'all');

     // Filtered and Sorted Escrows
     filteredEscrows = computed(() => {
          let escrows = [...(this.infoData()?.escrowsToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const after = this.expiresAfter();
          const before = this.expiresBefore();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               escrows = escrows.filter(escrow => escrow.id?.toLowerCase().includes(query) || escrow.amount?.toLowerCase().includes(query) || this.getParty(escrow).toLowerCase().includes(query) || escrow.EscrowSequence?.toString().toLowerCase().includes(query));
          }

          // Date Range Filter (by expiration - cancelAfter or finishAfter)
          if (after || before) {
               escrows = escrows.filter(escrow => {
                    const expirationValue = escrow.cancelAfter || escrow.finishAfter;
                    if (!expirationValue) return false;

                    const expirationDate = new Date((expirationValue + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000);

                    if (isNaN(expirationDate.getTime())) return false;
                    if (after && expirationDate < new Date(after)) return false;
                    if (before && expirationDate > new Date(before)) return false;
                    return true;
               });
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               escrows = escrows.filter(escrow => {
                    switch (quickFilter) {
                         case 'expired':
                              return escrow.isExpired;
                         case 'active':
                              return !escrow.isExpired && escrow.finishAfter;
                         case 'pending':
                              return !escrow.isExpired && !escrow.finishAfter;
                         default:
                              return true;
                    }
               });
          }

          return escrows;
     });

     sortedEscrows = computed(() => {
          let items = [...this.filteredEscrows()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'amount':
                         valA = parseFloat(a.amount?.split(' ')[0] || '0');
                         valB = parseFloat(b.amount?.split(' ')[0] || '0');
                         break;
                    case 'party':
                         valA = this.getParty(a);
                         valB = this.getParty(b);
                         break;
                    case 'sequence':
                         valA = parseInt(a.EscrowSequence || '0', 10);
                         valB = parseInt(b.EscrowSequence || '0', 10);
                         break;
                    case 'expiration':
                         valA = a.cancelAfter || a.finishAfter || 0;
                         valB = b.cancelAfter || b.finishAfter || 0;
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedEscrows().length);

     summaryText = computed(() => {
          const info = this.escrowTransactionViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.escrowCount, this.tab(), ESCROW_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.infoData()?.escrowCount ?? 0;
          const tab = this.escrowTransactionViewModelService.activeTab();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredEscrows().length === 0) {
               return `No escrows matching "${query}"`;
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredEscrows().length === 0) {
               return `No escrows expire in the selected date range`;
          }
          if (quickFilter !== 'all' && this.filteredEscrows().length === 0) {
               return `No ${quickFilter} escrows found`;
          }
          if (count === 0) {
               switch (tab) {
                    case 'createEscrow':
                         return 'This wallet has not created any Escrows yet.';
                    case 'finishEscrow':
                         return 'This wallet has no Escrows to finish.';
                    case 'cancelEscrow':
                         return 'This wallet has no Escrows to cancel.';
                    default:
                         return 'No escrows found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const tab = this.escrowTransactionViewModelService.activeTab();
          const query = this.searchQuery();

          if (query && this.filteredEscrows().length === 0) return 'Try a different search term';
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredEscrows().length === 0) return 'Try adjusting the expiration date range';
          if (tab !== 'finishEscrow' && this.totalCount() === 0) return 'Use the Create tab to generate one.';
          if (tab === 'finishEscrow' && this.totalCount() === 0) return 'An escrow must be sent to this wallet to finish it.';

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
               case 'pending':
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

     setQuickFilter(filter: 'all' | 'expired' | 'active' | 'pending') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'party', 'sequence', 'expiration'];
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

     onEscrowClick(escrow: any) {
          if (this.tab() === 'createEscrow') return;
          this.escrowUtilService.onEscrowSelectedInUi(escrow);
          this.escrowSelected.emit(escrow);
          this.toggleInfoPanel.emit();
     }

     castToCreateEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'createEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               destination: (escrow as any).destination || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }

     castToFinishEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'finishEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               sender: (escrow as any).sender || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }

     castToCancelEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'cancelEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               destination: (escrow as any).destination || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }
}
