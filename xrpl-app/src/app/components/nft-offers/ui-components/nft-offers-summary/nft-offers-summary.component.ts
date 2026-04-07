import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-nft-offers-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule],
     templateUrl: './nft-offers-summary.component.html',
     styleUrl: './nft-offers-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly nftOffersTransactionViewModelService = inject(NftOffersTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly utilsService = inject(UtilsService);

     // Optional: expose infoData directly if you want to control it from parent
     readonly infoData = this.nftOffersTransactionViewModelService.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     nftSelected = output<any>();

     onNftClick(nft: any) {
          this.nftSelected.emit(nft);
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     formatAmount(amount: any): string {
          // Check if it's an IOU object
          if (typeof amount === 'object' && amount !== null && amount.value && amount.currency) {
               return `${amount.value} ${amount.currency} ${amount.issuer ? `(Issuer: ${amount.issuer})` : ''}`;
          }
          // Otherwise treat as XRP (string number in drops)
          return `${amount}`;
     }
}
