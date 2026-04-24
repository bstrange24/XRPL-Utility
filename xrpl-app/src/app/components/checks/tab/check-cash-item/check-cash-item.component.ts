import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CashCheckItem } from '../../constants/checks.types';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-check-cash-item',
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TooltipLinkComponent, NgIcon],
     templateUrl: './check-cash-item.component.html',
     styleUrl: './check-cash-item.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckCashItemComponent {
     readonly txUiService = inject(TransactionUiService);
     readonly utilsService = inject(UtilsService);
     readonly copyUtilService = inject(CopyUtilService);
     @Input({ required: true }) check!: CashCheckItem;

     constructor() {}
}
