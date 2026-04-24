import { ChangeDetectionStrategy, Component, inject, input, Input } from '@angular/core';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CreateCheckItem } from '../../constants/checks.types';
import { NgIcon } from '@ng-icons/core';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

@Component({
     selector: 'app-check-create-item',
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TooltipLinkComponent, NgIcon, SummaryKeyValueComponent],
     templateUrl: './check-create-item.component.html',
     styleUrl: './check-create-item.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckCreateItemComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly copyUtilService = inject(CopyUtilService);

     constructor() {}

     @Input({ required: true }) check!: CreateCheckItem;
}
