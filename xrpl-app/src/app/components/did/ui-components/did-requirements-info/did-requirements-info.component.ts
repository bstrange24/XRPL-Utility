import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-did-requirements-info',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './did-requirements-info.component.html',
     styleUrl: './did-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidRequirementsInfoComponent {
     activeTab = input.required<'setDid' | 'deleteDid'>();

     // Collapsible state
     isExpanded = signal(false);
}
