import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { NgIcon } from '@ng-icons/core';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowCreateItemComponent } from '../../tab/escrow-create-item/escrow-create-item.component';
import { EscrowCancelItemComponent } from '../../tab/escrow-cancel-item/escrow-cancel-item.component';
import { EscrowFinishItemComponent } from '../../tab/escrow-finish-item/escrow-finish-item.component';
import { EscrowActionTypes } from '../../constants/time-escrow.types';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-escrow-summary',
     standalone: true,
     imports: [NgIcon, EscrowCreateItemComponent, EscrowCancelItemComponent, EscrowFinishItemComponent, LucideAngularModule, EscrowCreateItemComponent, EscrowFinishItemComponent, EscrowCancelItemComponent],
     templateUrl: './escrow-summary.component.html',
     styleUrl: './escrow-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);

     // Inputs from parent (credentials page)
     wallet = input.required<{ address: string } | null | undefined>();
     escrowLength = input.required<number>();
     tab = input.required<EscrowActionTypes>();

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     escrowSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     onEscrowClick(escrow: any) {
          this.escrowUtilService.onEscrowSelectedInUi(escrow);
          this.escrowSelected.emit(escrow);
     }

     selectEscrow(escrow: any, _source: 'list') {
          this.escrowUtilService.onEscrowSelected(escrow);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }
}
