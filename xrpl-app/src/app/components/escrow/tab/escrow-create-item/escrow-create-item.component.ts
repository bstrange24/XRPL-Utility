import { ChangeDetectionStrategy, Component, inject, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowDisplayItem } from '../../constants/time-escrow.types';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-escrow-create-item',
     standalone: true,
     imports: [CommonModule, LucideAngularModule, OverlayModule, TooltipLinkComponent, NgIcon],
     templateUrl: './escrow-create-item.component.html',
     styleUrl: './escrow-create-item.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowCreateItemComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);

     @Input({ required: true }) escrow!: EscrowDisplayItem & { tab: 'createEscrow' | 'cancelEscrow' };
     escrowSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     onEscrowClick(escrow: any) {
          this.escrowSelected.emit(escrow);
     }

     selectEscrow(escrow: any, _source: 'list') {
          this.escrowUtilService.onEscrowSelected(escrow);
     }
}
