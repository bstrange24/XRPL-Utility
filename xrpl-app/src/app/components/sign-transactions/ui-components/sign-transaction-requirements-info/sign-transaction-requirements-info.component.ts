import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-sign-transaction-requirements-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './sign-transaction-requirements-info.component.html',
     styleUrl: './sign-transaction-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionRequirementsInfoComponent {
     activeTab = input.required<'sendXrp'>();

     // Collapsible state
     isExpanded = signal(false);
}
