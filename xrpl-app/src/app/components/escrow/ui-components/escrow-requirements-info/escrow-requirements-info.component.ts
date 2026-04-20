import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-escrow-requirements-info',
     imports: [NgIcon],
     templateUrl: './escrow-requirements-info.component.html',
     styleUrl: './escrow-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowRequirementsInfoComponent {
     page = input.required<boolean>();

     activeTab = input.required<'createEscrow'>();

     // Collapsible state
     isExpanded = signal(false);
}
