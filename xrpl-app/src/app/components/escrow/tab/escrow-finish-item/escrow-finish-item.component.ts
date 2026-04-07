import { Component, inject, input, Input, output } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { EscrowDisplayItem } from '../../constants/time-escrow.types';

@Component({
     selector: 'app-escrow-finish-item',
     imports: [CommonModule, LucideAngularModule, OverlayModule, TooltipLinkComponent],
     templateUrl: './escrow-finish-item.component.html',
     styleUrl: './escrow-finish-item.component.css',
})
export class EscrowFinishItemComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);

     @Input({ required: true }) escrow!: EscrowDisplayItem & { tab: 'finishEscrow' };
     escrowSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     onEscrowClick(escrow: any) {
          this.escrowSelected.emit(escrow);
     }

     selectEscrow(escrow: any, _source: 'list') {
          this.escrowUtilService.onEscrowSelected(escrow);
     }
}
