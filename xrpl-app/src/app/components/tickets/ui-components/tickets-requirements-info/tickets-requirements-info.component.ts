import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-tickets-requirements-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './tickets-requirements-info.component.html',
     styleUrl: './tickets-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsRequirementsInfoComponent {
     activeTab = input.required<'createTicket'>();

     // Collapsible state
     isExpanded = signal(false);
}
