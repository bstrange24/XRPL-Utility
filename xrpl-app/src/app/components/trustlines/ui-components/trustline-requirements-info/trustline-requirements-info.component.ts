import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-trustline-requirements-info',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './trustline-requirements-info.component.html',
     styleUrl: './trustline-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineRequirementsInfoComponent {
     activeTab = input.required<'setTrustline'>();

     // Collapsible state
     isExpanded = signal(false);
}
