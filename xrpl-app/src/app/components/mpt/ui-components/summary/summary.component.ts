import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

const MPT_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'Multi-Purpose Token',
     itemNamePlural: 'Multi-Purpose Tokens',
     actionMap: {
          createMpt: 'created.',
          authorizeMpt: 'awaiting authorization.',
          unauthorizeMpt: 'that can be unauthorized.',
          sendMpt: 'available to send.',
          lockMpt: 'that can be locked.',
          unlockMpt: 'that can be unlocked.',
          clawbackMpt: 'that can be clawed back.',
          destroyMpt: 'that can be destroyed.',
     },
     defaultAction: 'available.',
};

@Component({
     selector: 'app-summary',
     standalone: true,
     imports: [NgIcon, TooltipLinkComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './summary.component.html',
     styleUrl: './summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     readonly infoData = this.viewModel.infoData;

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     explorerUrl = this.txUiService.explorerUrl;
     mptSelected = output<any>();

     // Computed summary text using the builder service
     summaryText = computed(() => {
          const info = this.viewModel.infoData();
          if (!info) return '';

          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.mptCount, this.viewModel.activeTab(), MPT_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.viewModel.infoData();
          const count = info?.mptCount || 0;

          if (count > 0) return ''; // Empty state only shown when count is 0

          const activeTab = this.viewModel.activeTab();

          switch (activeTab) {
               case 'createMpt':
                    return 'This wallet has not created any MPTs yet.';
               case 'authorizeMpt':
                    return 'This wallet has no MPTs to authorize.';
               case 'unauthorizeMpt':
                    return 'This wallet has no MPTs to unauthorize.';
               case 'sendMpt':
                    return 'This wallet has no MPTs available to send.';
               case 'lockMpt':
                    return 'This wallet has no MPTs to lock.';
               case 'unlockMpt':
                    return 'This wallet has no MPTs to unlock.';
               case 'clawbackMpt':
                    return 'This wallet has no MPTs to clawback.';
               case 'destroyMpt':
                    return 'This wallet has no MPTs to destroy.';
               default:
                    return 'No Multi-Purpose Tokens found.';
          }
     });

     onMptClick(mpt: any) {
          this.mptSelected.emit(mpt);

          // Collapse on EVERY tab EXCEPT createMpt
          const currentTab = this.viewModel.activeTab();
          if (currentTab !== 'createMpt') {
               this.toggleInfoPanel.emit();
          }
     }
}
