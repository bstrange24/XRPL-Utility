import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { CheckCreateItemComponent } from '../../tab/check-create-item/check-create-item.component';
import { CheckCashItemComponent } from '../../tab/check-cash-item/check-cash-item.component';
import { CheckCancelItemComponent } from '../../tab/check-cancel-item/check-cancel-item.component';
import { CheckActionTypes, CreateCheckItem, CashCheckItem, CancelCheckItem } from '../../constants/checks.types';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';

const CHECKS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'check',
     itemNamePlural: 'checks',
     actionMap: {
          createCheck: 'created.',
          cashCheck: 'that can be cashed.',
          cancelCheck: 'that can be cancelled.',
     },
};

@Component({
     selector: 'app-checks-summary',
     standalone: true,
     imports: [LucideAngularModule, CheckCancelItemComponent, CheckCashItemComponent, CheckCreateItemComponent, SummaryContainerComponent, SummaryItemComponent],
     templateUrl: './checks-summary.component.html',
     styleUrl: './checks-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);

     // Inputs from parent
     wallet = input.required<{ address: string } | null | undefined>();
     checksLength = input.required<number>();
     tab = input.required<CheckActionTypes>();

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     checkSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     // Computed summary text using the builder service
     summaryText = computed(() => {
          const info = this.checksTransactionViewModelService.infoData();
          if (!info) return '';

          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.checkCount, this.tab(), CHECKS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const info = this.checksTransactionViewModelService.infoData();
          const count = info?.checkCount || 0;

          if (count > 0) return ''; // Empty state only shown when count is 0

          switch (this.tab()) {
               case 'createCheck':
                    return 'This wallet has not created any Checks yet.';
               case 'cashCheck':
                    return 'This wallet has no Checks to cash.';
               case 'cancelCheck':
                    return 'This wallet has no Checks to cancel.';
               default:
                    return 'No checks found.';
          }
     });

     onCheckClick(check: any) {
          this.checkSelected.emit(check);

          // Collapse summary after selection (same pattern as escrow)
          if (this.tab() === 'cashCheck' || this.tab() === 'cancelCheck') {
               this.toggleInfoPanel.emit();
          }
     }

     selectCheck(check: any, _source: 'list') {
          this.checkUtilService.onCheckSelected(check);
     }

     // Type casting helper methods
     castToCreateCheck(check: CreateCheckItem) {
          return {
               tab: 'createCheck' as const,
               index: check.index,
               amount: check.amount,
               destination: check.destination || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }

     castToCashCheck(check: CashCheckItem) {
          return {
               tab: 'cashCheck' as const,
               index: check.index,
               amount: check.amount,
               sender: check.sender || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }

     castToCancelCheck(check: CancelCheckItem) {
          return {
               tab: 'cancelCheck' as const,
               index: check.index,
               amount: check.amount,
               // sender: check.sender || '',
               destination: check.destination || '',
               sendMax: check.sendMax,
               destinationTag: check.destinationTag,
               expiration: check.expiration,
               isExpired: check.isExpired,
               display: check.display,
               secondary: check.secondary,
               id: check.id,
          };
     }
}
