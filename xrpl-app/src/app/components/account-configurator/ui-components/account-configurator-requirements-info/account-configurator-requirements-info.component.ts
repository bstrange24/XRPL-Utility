import { ChangeDetectionStrategy, Component, input, signal, Signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-account-configurator-requirements-info',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './account-configurator-requirements-info.component.html',
     styleUrl: './account-configurator-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorRequirementsInfoComponent {
     activeTab = input.required<Signal<ACCOUNT_ACTIONS>>();

     // Collapsible state
     isExpanded = signal(false);
}
