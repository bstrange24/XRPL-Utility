import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { CheckCreateItemComponent } from '../../tab/check-create-item/check-create-item.component';
import { CheckCashItemComponent } from '../../tab/check-cash-item/check-cash-item.component';
import { CheckCancelItemComponent } from '../../tab/check-cancel-item/check-cancel-item.component';
import { CheckActionTypes, CreateCheckItem, CashCheckItem, CancelCheckItem, CheckListItem } from '../../constants/checks.types';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { ExpirationFilterInputComponent } from '../../../shared/expiration-filter-input/expiration-filter-input.component';
import { NgIcon } from '@ng-icons/core';

const CHECKS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'check',
     itemNamePlural: 'checks',
     actionMap: {
          createCheck: 'created.',
          cashCheck: 'that can be cashed.',
          cancelCheck: 'that can be cancelled.',
     },
};

type SortKey = 'amount' | 'party' | 'index' | 'expiration';

@Component({
     selector: 'app-checks-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, CheckCancelItemComponent, CheckCashItemComponent, CheckCreateItemComponent, SummaryContainerComponent, SummaryItemComponent, FormsModule, SortControlComponent, ExpirationFilterInputComponent],
     templateUrl: './checks-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs from parent
     wallet = input.required<{ address: string } | null | undefined>();
     checksLength = input.required<number>();
     tab = input.required<CheckActionTypes>();
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     checkSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly expiresAfter = signal<string>('');
     readonly expiresBefore = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'expired' | 'active' | 'cashable'>('all');
     readonly sortBy = signal<SortKey>('expiration');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'party', label: 'Sender/Destination' },
          { key: 'index', label: 'Check Index' },
          { key: 'expiration', label: 'Expiration' },
     ];

     quickFilters: { key: 'all' | 'active' | 'expired' | 'cashable'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'active', label: 'Active', icon: 'heroClock', color: 'green' },
          { key: 'expired', label: 'Expired', icon: 'heroExclamationCircle', color: 'red' },
          { key: 'cashable', label: 'Cashable', icon: 'heroCurrencyDollar', color: 'purple' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     // Helper function to normalize check to a consistent type
     private normalizeCheck(check: CheckListItem): any {
          return {
               ...check,
               display: check.display || `${check.amount} → ${(check as any).destination || (check as any).sender || 'unknown'}`,
               secondary: check.secondary || `Index: ${check.index}`,
          };
     }

     // Helper function to get party (sender or destination) from check
     private getParty(check: CheckListItem): string {
          if (check.tab === 'cashCheck') {
               return (check as CashCheckItem).sender || '';
          }
          return (check as CreateCheckItem | CancelCheckItem).destination || '';
     }

     // Helper function to get expiration timestamp
     private getExpirationTimestamp(check: CheckListItem): number {
          if (!check.expiration) return 0;
          // Check expiration is in seconds since epoch
          const timestamp = check.expiration * 1000;
          return isNaN(timestamp) ? 0 : timestamp;
     }

     // Helper function to get amount value
     private getAmountValue(check: CheckListItem): number {
          const amountStr = check.amount || (check as any).sendMax || '0';
          return parseFloat(amountStr.split(' ')[0]) || 0;
     }

     // Computed values
     infoData = computed(() => this.checksTransactionViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.checkCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.expiresAfter() || this.expiresBefore() || this.activeQuickFilter() !== 'all');

     // Get normalized checks list
     normalizedChecks = computed(() => {
          const checks = this.infoData()?.checksToShow ?? [];
          return checks.map(check => this.normalizeCheck(check));
     });

     // Filtered and Sorted Checks
     filteredChecks = computed(() => {
          let checks = [...this.normalizedChecks()];
          const query = this.searchQuery().trim().toLowerCase();
          const after = this.expiresAfter();
          const before = this.expiresBefore();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               checks = checks.filter(check => check.index?.toLowerCase().includes(query) || check.amount?.toLowerCase().includes(query) || (check.sendMax || '').toLowerCase().includes(query) || this.getParty(check).toLowerCase().includes(query));
          }

          // Date Range Filter (by expiration)
          if (after || before) {
               checks = checks.filter(check => {
                    if (!check.expiration) return false;
                    const expirationDate = new Date(this.getExpirationTimestamp(check));
                    if (isNaN(expirationDate.getTime())) return false;
                    if (after && expirationDate < new Date(after)) return false;
                    if (before && expirationDate > new Date(before)) return false;
                    return true;
               });
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               checks = checks.filter(check => {
                    switch (quickFilter) {
                         case 'expired':
                              return check.isExpired;
                         case 'active':
                              return !check.isExpired;
                         case 'cashable':
                              return !check.isExpired && check.tab === 'cashCheck';
                         default:
                              return true;
                    }
               });
          }

          return checks;
     });

     sortedChecks = computed(() => {
          let items = [...this.filteredChecks()];
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
                    case 'party':
                         valA = this.getParty(a);
                         valB = this.getParty(b);
                         break;
                    case 'index':
                         valA = a.index || '';
                         valB = b.index || '';
                         break;
                    case 'expiration':
                         valA = this.getExpirationTimestamp(a);
                         valB = this.getExpirationTimestamp(b);
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedChecks().length);

     summaryText = computed(() => {
          const info = this.checksTransactionViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.checkCount, this.tab(), CHECKS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.checksTransactionViewModelService.infoData();
          const count = info?.checkCount || 0;
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredChecks().length === 0) {
               return `No checks matching "${query}"`;
          }
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredChecks().length === 0) {
               return `No checks expire in the selected date range`;
          }
          if (quickFilter !== 'all' && this.filteredChecks().length === 0) {
               return `No ${quickFilter} checks found`;
          }
          if (count === 0) {
               switch (this.tab()) {
                    case 'createCheck':
                         return 'This wallet has not created any Checks yet.';
                    case 'cashCheck':
                         return 'This wallet has no Checks to cash.';
                    case 'cancelCheck':
                         return 'This wallet has no Checks to cancel.';
                    default:
                         return 'No checks found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();

          if (query && this.filteredChecks().length === 0) return 'Try a different search term';
          if ((this.expiresAfter() || this.expiresBefore()) && this.filteredChecks().length === 0) return 'Try adjusting the expiration date range';
          if ((this.tab() === 'createCheck' || this.tab() === 'cancelCheck') && this.totalCount() === 0) return 'Use the Create tab to generate one.';
          if (this.tab() === 'cashCheck' && this.totalCount() === 0) return 'An check must be sent to this wallet to cash it.';

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
               case 'cashable':
                    colorClass = 'btn-filter-purple';
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

     setQuickFilter(filter: 'all' | 'expired' | 'active' | 'cashable') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'party', 'index', 'expiration'];
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

     onCheckClick(check: any) {
          if (this.tab() === 'createCheck') return;
          this.checkUtilService.onCheckSelectedInUi(check);
          this.checkSelected.emit(check);
          this.toggleInfoPanel.emit();
     }

     selectCheck(check: any, _source: 'list') {
          this.checkUtilService.onCheckSelected(check);
     }

     // Type casting helper methods
     castToCreateCheck(check: any) {
          return {
               tab: 'createCheck' as const,
               index: check.index,
               amount: check.amount,
               destination: check.destination || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }

     castToCashCheck(check: any) {
          return {
               tab: 'cashCheck' as const,
               index: check.index,
               amount: check.amount,
               sender: check.sender || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }

     castToCancelCheck(check: any) {
          return {
               tab: 'cancelCheck' as const,
               index: check.index,
               amount: check.amount,
               destination: check.destination || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }
}
