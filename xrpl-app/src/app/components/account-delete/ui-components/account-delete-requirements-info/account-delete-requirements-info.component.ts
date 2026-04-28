import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-account-delete-requirements-info',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './account-delete-requirements-info.component.html',
     styleUrl: './account-delete-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteRequirementsInfoComponent {
     activeTab = input.required<'deleteAccount'>();

     // Collapsible state
     isExpanded = signal(false);
}
