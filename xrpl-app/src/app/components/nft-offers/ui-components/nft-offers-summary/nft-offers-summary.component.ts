import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

const NFT_OFFERS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'active NFT offer',
     itemNamePlural: 'active NFT offers',
     actionMap: {
          buyNft: 'created for buying NFTs.',
          sellNft: 'created for selling NFTs.',
          buyNftOffer: 'created for buying NFTs.',
          sellNftOffer: 'created for selling NFTs.',
          cancelNftOffer: 'available to cancel.',
     },
     defaultAction: 'available.',
};

@Component({
     selector: 'app-nft-offers-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
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
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     // Optional: expose infoData directly if you want to control it from parent
     readonly infoData = this.nftOffersTransactionViewModelService.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     nftSelected = output<any>();

     // Computed summary text using the builder service
     summaryText = computed(() => {
          const info = this.nftOffersTransactionViewModelService.infoData();
          if (!info) return '';

          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.offerCount, this.nftOffersTransactionViewModelService.activeTab(), NFT_OFFERS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.nftOffersTransactionViewModelService.infoData();
          const count = info?.offerCount || 0;

          if (count > 0) return ''; // Empty state only shown when count is 0

          const activeTab = this.nftOffersTransactionViewModelService.activeTab();

          switch (activeTab) {
               case 'buyNft':
               case 'buyNftOffer':
                    return 'This wallet has not created any NFT buy offers.';
               case 'sellNft':
               case 'sellNftOffer':
                    return 'This wallet has not created any NFT sell offers.';
               case 'cancelNftOffer':
                    return 'This wallet has no NFT offers to cancel.';
               default:
                    return 'No NFT offers found.';
          }
     });

     onNftClick(offer: any) {
          const currentTab = this.nftOffersTransactionViewModelService.activeTab();
          if (currentTab === 'sellNft') {
               return;
          }

          this.nftSelected.emit(offer);

          // Collapse on EVERY tab EXCEPT createMpt
          this.toggleInfoPanel.emit();
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
