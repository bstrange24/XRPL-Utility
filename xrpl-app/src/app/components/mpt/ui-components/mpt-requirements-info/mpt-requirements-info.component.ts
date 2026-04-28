import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-mpt-requirements-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './mpt-requirements-info.component.html',
     styleUrl: './mpt-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptRequirementsInfoComponent {
     activeTab = input.required<'createMpt'>();

     // Collapsible state
     isExpanded = signal(false);
}
