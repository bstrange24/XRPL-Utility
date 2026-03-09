import { Component, inject, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../../services/copy-util/copy-util.service';
import { UtilsService } from '../../../../../services/util-service/utils.service';

@Component({
     selector: 'app-account-configurator-requirements-info',
     imports: [NgIcon],
     templateUrl: './account-configurator-requirements-info.component.html',
     styleUrl: './account-configurator-requirements-info.component.css',
})
export class AccountConfiguratorRequirementsInfoComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly copyUtilService = inject(CopyUtilService);

     activeTab = input.required<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey'>();
}
