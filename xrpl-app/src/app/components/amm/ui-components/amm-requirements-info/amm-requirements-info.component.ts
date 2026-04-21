import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-amm-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './amm-requirements-info.component.html',
     styleUrl: './amm-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmmRequirementsInfoComponent {
     activeTab = input.required<'createAMM'>();

     // Collapsible state
     isExpanded = signal(false);
}
