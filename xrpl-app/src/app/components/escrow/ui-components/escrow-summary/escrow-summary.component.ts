import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowCreateItemComponent } from '../../tab/escrow-create-item/escrow-create-item.component';
import { EscrowCancelItemComponent } from '../../tab/escrow-cancel-item/escrow-cancel-item.component';
import { EscrowFinishItemComponent } from '../../tab/escrow-finish-item/escrow-finish-item.component';
import { AnyEscrowDisplayItem, EscrowActionTypes } from '../../constants/time-escrow.types';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';

const ESCROW_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'escrow',
     itemNamePlural: 'escrows',
     actionMap: {
          createEscrow: 'created.',
          finishEscrow: 'that can be finished.',
          cancelEscrow: 'that can be cancelled.',
     },
};

@Component({
     selector: 'app-escrow-summary',
     standalone: true,
     imports: [EscrowCreateItemComponent, EscrowCancelItemComponent, EscrowFinishItemComponent, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent],
     templateUrl: './escrow-summary.component.html',
     styleUrl: './escrow-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);

     wallet = input.required<{ address: string } | null | undefined>();
     escrowLength = input.required<number>();
     tab = input.required<EscrowActionTypes>();

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     escrowSelected = output<any>();
     explorerUrl = this.txUiService.explorerUrl;

     onEscrowClick(escrow: any) {
          if (this.tab() === 'createEscrow') {
               return;
          }

          this.escrowUtilService.onEscrowSelectedInUi(escrow);
          this.escrowSelected.emit(escrow);
          this.toggleInfoPanel.emit();
     }

     selectEscrow(escrow: any, _source: 'list') {
          this.escrowUtilService.onEscrowSelected(escrow);
     }

     summaryText = computed(() => {
          const info = this.escrowTransactionViewModelService.infoData();
          if (!info) return '';

          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.escrowCount, this.tab(), ESCROW_SUMMARY_CONFIG);
     });

     getActionText(): string {
          switch (this.tab()) {
               case 'createEscrow':
                    return 'created.';
               case 'finishEscrow':
                    return 'that can be finished.';
               case 'cancelEscrow':
                    return 'that can be cancelled.';
               default:
                    return '';
          }
     }

     emptyStateMessage = computed(() => {
          switch (this.tab()) {
               case 'createEscrow':
                    return 'This wallet has not created any Escrows yet.';
               case 'finishEscrow':
                    return 'This wallet has no Escrows to finish.';
               case 'cancelEscrow':
                    return 'This wallet has no Escrows to cancel.';
               default:
                    return 'No escrows found.';
          }
     });

     castToCreateEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'createEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               destination: escrow.destination || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }

     castToFinishEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'finishEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               sender: escrow.sender || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }

     castToCancelEscrow(escrow: AnyEscrowDisplayItem) {
          return {
               tab: 'cancelEscrow' as const,
               EscrowSequence: escrow.EscrowSequence,
               amount: escrow.amount,
               destination: escrow.destination || '',
               finishAfter: escrow.finishAfter,
               cancelAfter: escrow.cancelAfter,
               isExpired: escrow.isExpired,
               display: escrow.display,
               secondary: escrow.secondary,
               id: escrow.id,
          };
     }
}
