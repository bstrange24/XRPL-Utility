import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-checks-requirement-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './checks-requirement-info.component.html',
     styleUrl: './checks-requirement-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksRequirementInfoComponent {
     activeTab = input.required<'createCheck'>();

     // Collapsible state
     isExpanded = signal(false);
}
