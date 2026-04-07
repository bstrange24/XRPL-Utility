import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { CheckCreateItemComponent } from '../../tab/check-create-item/check-create-item.component';
import { CheckCashItemComponent } from '../../tab/check-cash-item/check-cash-item.component';
import { CheckCancelItemComponent } from '../../tab/check-cancel-item/check-cancel-item.component';
import { CheckActionTypes } from '../../constants/checks.types';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-checks-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, CheckCancelItemComponent, CheckCashItemComponent, CheckCreateItemComponent],
     templateUrl: './checks-summary.component.html',
     styleUrl: './checks-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);

     // Inputs from parent (credentials page)
     wallet = input.required<{ address: string } | null | undefined>();
     checksLength = input.required<number>();
     tab = input.required<CheckActionTypes>();

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     checkSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     onCheckClick(check: any) {
          this.checkSelected.emit(check);
     }

     selectCheck(check: any, _source: 'list') {
          this.checkUtilService.onCheckSelected(check);
     }
}
