import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AccountConfiguratorViewModelService } from '../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';

@Component({
     selector: 'app-account-configurator-summary',
     standalone: true,
     imports: [NgIcon, SummaryContainerComponent, SummaryItemComponent],
     templateUrl: './account-configurator-summary.component.html',
     styleUrl: './account-configurator-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorSummaryComponent {
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly copyUtilService = inject(CopyUtilService);

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     tab = input.required<ACCOUNT_ACTIONS>();
}
