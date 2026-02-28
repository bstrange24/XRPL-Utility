import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { EscrowDisplayItem } from '../../../../models/interface-items.model';

@Component({
     selector: 'app-escrow-create-item',
     standalone: true,
     imports: [CommonModule, LucideAngularModule, OverlayModule, TooltipLinkComponent],
     templateUrl: './escrow-create-item.component.html',
     styleUrl: './escrow-create-item.component.css',
})
export class EscrowCreateItemComponent {
     @Input({ required: true }) escrow!: EscrowDisplayItem & { tab: 'create' | 'cancel' };

     constructor(
          public txUiService: TransactionUiService,
          public utilsService: UtilsService,
          public copyUtilService: CopyUtilService
     ) {}

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }
}
