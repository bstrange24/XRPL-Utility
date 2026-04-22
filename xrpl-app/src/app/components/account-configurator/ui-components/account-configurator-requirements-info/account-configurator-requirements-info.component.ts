import { ChangeDetectionStrategy, Component, input, signal, Signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';

@Component({
     selector: 'app-account-configurator-requirements-info',
     imports: [NgIcon],
     templateUrl: './account-configurator-requirements-info.component.html',
     styleUrl: './account-configurator-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorRequirementsInfoComponent {
     activeTab = input.required<Signal<ACCOUNT_ACTIONS>>();

     // Collapsible state
     isExpanded = signal(false);
}
