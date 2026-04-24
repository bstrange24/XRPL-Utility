import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { NgIcon } from '@ng-icons/core';

const NFT_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'NFT',
     itemNamePlural: 'NFTs',
     actionMap: {
          createNft: 'created.',
          updateNFTMetadata: 'available for update.',
          burnNft: 'available for burning.',
     },
     defaultAction: 'available.',
};

@Component({
     selector: 'app-nft-create-summary',
     standalone: true,
     imports: [TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, NgIcon],
     templateUrl: './nft-create-summary.component.html',
     styleUrl: './nft-create-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftCreateSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly nftTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     // Optional: expose infoData directly if you want to control it from parent
     readonly infoData = this.nftTransactionViewModelService.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     nftSelected = output<any>();

     // Computed summary text using the builder service
     summaryText = computed(() => {
          const info = this.nftTransactionViewModelService.infoData();
          if (!info) return '';

          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.nftCount, this.nftTransactionViewModelService.activeTab(), NFT_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.nftTransactionViewModelService.infoData();
          const count = info?.nftCount || 0;

          if (count > 0) return ''; // Empty state only shown when count is 0

          const activeTab = this.nftTransactionViewModelService.activeTab();

          switch (activeTab) {
               case 'createNft':
                    return 'This wallet has not created any NFTs yet.';
               case 'updateNFTMetadata':
                    return 'This wallet has no NFTs to update.';
               case 'burnNft':
                    return 'This wallet has no NFTs to burn.';
               default:
                    return 'No NFTs found.';
          }
     });

     onNftClick(nft: any) {
          this.nftSelected.emit(nft);

          // Collapse on EVERY tab EXCEPT createMpt
          const currentTab = this.nftTransactionViewModelService.activeTab();
          if (currentTab !== 'createNft') {
               this.toggleInfoPanel.emit();
          }
     }
}
