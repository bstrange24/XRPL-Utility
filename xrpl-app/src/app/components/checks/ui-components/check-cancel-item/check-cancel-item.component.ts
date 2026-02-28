import { Component, Input } from '@angular/core';
import { CancelCheckItem } from '../../../../models/interface-items.model';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';

@Component({
     selector: 'app-check-cancel-item',
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TooltipLinkComponent],
     templateUrl: './check-cancel-item.component.html',
     styleUrl: './check-cancel-item.component.css',
})
export class CheckCancelItemComponent {
     @Input({ required: true }) check!: CancelCheckItem;

     constructor(
          public txUiService: TransactionUiService,
          public utilsService: UtilsService,
          public copyUtilService: CopyUtilService
     ) {}

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }
}
