import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';

@Component({
     selector: 'app-tickets-summary',
     standalone: true,
     imports: [NgIcon],
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

     toggleInfoPanel = output<void>();
}
