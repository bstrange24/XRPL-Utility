import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-escrow-requirements-info',
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './escrow-requirements-info.component.html',
     styleUrl: './escrow-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowRequirementsInfoComponent {
     page = input.required<boolean>();

     activeTab = input.required<'createEscrow'>();

     // Collapsible state
     isExpanded = signal(false);
}
