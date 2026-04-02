import { Component, inject, input, output } from '@angular/core';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';

@Component({
     selector: 'app-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule],
     templateUrl: './summary.component.html',
     styleUrl: './summary.component.css',
})
export class SummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly mptUtilService = inject(MptUtilService);

     // Optional: expose infoData directly if you want to control it from parent
     readonly infoData = this.viewModel.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     mptSelected = output<any>();

     onMptClick(mpt: any) {
          this.mptSelected.emit(mpt);
     }
}
