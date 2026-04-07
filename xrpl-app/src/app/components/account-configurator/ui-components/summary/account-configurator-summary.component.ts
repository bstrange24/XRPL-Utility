import { Component, inject, input, output } from '@angular/core';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { StorageService } from '../../../../services/shared/local-storage/storage.service';
import { AccountConfiguratorViewModelService } from '../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { AccountConfiguratorOrchestratorService } from '../../../../services/account-configurator/account-configurator-orchestrator/account-configurator-orchestrator.service';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { NgIcon } from '@ng-icons/core';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';

@Component({
     selector: 'app-account-configurator-summary',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './account-configurator-summary.component.html',
     styleUrl: './account-configurator-summary.component.css',
})
export class AccountConfiguratorSummaryComponent {
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly accountConfiguratorOrchestratorService = inject(AccountConfiguratorOrchestratorService);
     public readonly storageService = inject(StorageService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     tab = input.required<ACCOUNT_ACTIONS>();
}
