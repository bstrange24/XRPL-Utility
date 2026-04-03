import { Component, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';

@Component({
     selector: 'app-nft-create-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule],
     templateUrl: './nft-create-summary.component.html',
     styleUrl: './nft-create-summary.component.css',
})
export class NftCreateSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly nftTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly nftUtilService = inject(NftUtilService);

     // Optional: expose infoData directly if you want to control it from parent
     readonly infoData = this.nftTransactionViewModelService.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     nftSelected = output<any>();

     onNftClick(nft: any) {
          this.nftSelected.emit(nft);
     }
}
