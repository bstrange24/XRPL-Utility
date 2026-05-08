import { ChangeDetectionStrategy, Component, input, Signal, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-requirements-info',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './permissioned-domain-requirements-info.component.html',
     styleUrl: './permissioned-domain-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainRequirementsInfoComponent {
     activeTab = input.required<Signal<'setPermissionedDomain' | 'deletePermissionedDomain'>>();

     // Collapsible state
     isExpanded = signal(false);
}
