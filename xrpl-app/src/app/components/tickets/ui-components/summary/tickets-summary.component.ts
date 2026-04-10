import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-tickets-summary',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './tickets-summary.component.html',
     styleUrl: './tickets-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsSummaryComponent {
     infoData = input.required<string | null>();

     tab = input<'createTicket'>('createTicket');
     summaryMessage = input<string>('');
     infoPanelExpanded = input<boolean>(false);

     toggleInfoPanel = output<void>();
}
