import { Component, Input } from '@angular/core';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { EscrowDisplayItem } from '../../../../models/interface-items.model';

@Component({
     selector: 'app-escrow-finish-item',
     imports: [CommonModule, LucideAngularModule, OverlayModule, TooltipLinkComponent],
     templateUrl: './escrow-finish-item.component.html',
     styleUrl: './escrow-finish-item.component.css',
})
export class EscrowFinishItemComponent {
     @Input({ required: true }) escrow!: EscrowDisplayItem & { tab: 'finish' };

     constructor(
          public txUiService: TransactionUiService,
          public utilsService: UtilsService,
          public copyUtilService: CopyUtilService
     ) {}

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }
}
