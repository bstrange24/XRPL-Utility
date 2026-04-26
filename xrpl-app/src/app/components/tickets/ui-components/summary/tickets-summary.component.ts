import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-tickets-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
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
