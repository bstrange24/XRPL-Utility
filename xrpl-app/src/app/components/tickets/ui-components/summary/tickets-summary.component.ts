import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

@Component({
     selector: 'app-tickets-summary',
     standalone: true,
     imports: [NgIcon, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './tickets-summary.component.html',
     styleUrl: './tickets-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsSummaryComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     infoData = input.required<string | null>();

     tab = input<'createTicket'>('createTicket');
     summaryMessage = input<string>('');
     infoPanelExpanded = input<boolean>(false);
     walletName = input<string>('');

     toggleInfoPanel = output<void>();

     emptyStateMessage = computed(() => {
          return this.tab() === 'createTicket' ? 'This wallet has not created any Tickets yet.' : 'This wallet has no Tickets to delete.';
     });

     emptyStateSubMessage = computed(() => {
          return ''; // or add a helpful message if you want
     });
}
