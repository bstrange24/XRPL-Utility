import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';

const TICKETS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'ticket',
     itemNamePlural: 'tickets',
     actionMap: {
          createTicket: 'created.',
     },
     defaultAction: 'available.',
};

@Component({
     selector: 'app-tickets-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, SummaryContainerComponent, FormsModule, SortControlComponent, SummaryItemComponent, SummaryContainerComponent],
     templateUrl: './tickets-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsSummaryComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly copyUtilService = inject(CopyUtilService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     info = input<any>();
     infoData = input<string | null>();
     isExpanded = input<boolean>();
     tab = input<'createTicket'>('createTicket');
     summaryMessage = input<string>('');
     infoPanelExpanded = input<boolean>(false);
     walletName = input<string>('');
     ticketCount = input<string>('');
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();

     totalTicketsCount = computed(() => this.xrplTxOptionsStore.walletTicketCount() ?? 0);
     allTickets = computed(() => this.xrplTxOptionsStore.allTicketsForWallet() ?? []);

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly sortBy = signal<'sequence'>('sequence');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options (just one option for consistency)
     sortOptions: SortOption[] = [{ key: 'sequence', label: 'Ticket Sequence' }];

     // Computed values
     hasActiveFilters = computed(() => this.searchQuery().length > 0);

     filteredTickets = computed(() => {
          let tickets = [...this.allTickets()];
          const query = this.searchQuery().trim().toLowerCase();

          // Filter
          if (query) {
               tickets = tickets.filter(t => t.toLowerCase().includes(query));
          }

          // Sort
          tickets.sort((a, b) => {
               const numA = Number(a);
               const numB = Number(b);
               return this.sortDirection() === 'asc' ? numA - numB : numB - numA;
          });

          return tickets;
     });

     // Filtered info based on search query
     filteredInfo = computed(() => {
          const info = this.infoData();
          const query = this.searchQuery().trim().toLowerCase();

          if (!info) return null;
          if (!query) return info;

          // Check if the info text contains the search query
          if (info.toLowerCase().includes(query)) {
               return info;
          }
          return null;
     });

     // Filtered count - whether the filtered info exists
     filteredCount = computed(() => {
          return this.filteredInfo() ? 1 : 0;
     });

     hasContent = computed(() => !!this.filteredInfo());

     summaryText = computed(() => {
          const wallet = this.walletName() || 'Selected wallet';
          return this.summaryTextConfigService.buildSummaryText(wallet, Number.parseInt(this.ticketCount()), this.tab(), TICKETS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredCount() === 0 && this.totalTicketsCount() > 0) {
               return `No tickets matching "${query}"`;
          }
          if (this.totalTicketsCount() === 0) {
               return this.tab() === 'createTicket' ? 'This wallet has not created any Tickets yet.' : 'This wallet has no Tickets to delete.';
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const query = this.searchQuery();
          if (query && this.filteredCount() === 0 && this.totalTicketsCount() > 0) {
               return 'Try a different search term';
          }
          return 'Use the Create tab to issue one.';
     });

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     onSortChange(event: SortChangeEvent) {
          this.sortBy.set(event.key as 'sequence');
          this.sortDirection.set(event.direction);
     }

     clearAllFilters() {
          this.searchQuery.set('');
     }

     clearSearch() {
          this.searchQuery.set('');
     }
}
