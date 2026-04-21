import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-trustline-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './trustline-requirements-info.component.html',
     styleUrl: './trustline-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineRequirementsInfoComponent {
     activeTab = input.required<'setTrustline'>();

     // Collapsible state
     isExpanded = signal(false);
}
