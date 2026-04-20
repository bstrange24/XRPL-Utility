import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-tickets-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './tickets-requirements-info.component.html',
     styleUrl: './tickets-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsRequirementsInfoComponent {
     activeTab = input.required<'createTicket'>();

     // Collapsible state
     isExpanded = signal(false);
}
