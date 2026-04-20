import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-mpt-requirements-info',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './mpt-requirements-info.component.html',
     styleUrl: './mpt-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptRequirementsInfoComponent {
     activeTab = input.required<'createMpt'>();

     // Collapsible state
     isExpanded = signal(false);
}
