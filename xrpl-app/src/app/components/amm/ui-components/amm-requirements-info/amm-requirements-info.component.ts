import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-amm-requirements-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './amm-requirements-info.component.html',
     styleUrl: './amm-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmmRequirementsInfoComponent {
     activeTab = input.required<'createAMM'>();

     // Collapsible state
     isExpanded = signal(false);
}
