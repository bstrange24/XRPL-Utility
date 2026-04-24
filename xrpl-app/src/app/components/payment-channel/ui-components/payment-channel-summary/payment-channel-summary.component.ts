// payment-channel-summary.component.ts
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { UnifiedPaymentChannel } from '../../constants/payment-channel.types';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

@Component({
     selector: 'app-payment-channel-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './payment-channel-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);

     infoPanelExpanded = input<boolean>(false);
     toggleInfoPanel = output<void>();
     paymentChannelSelected = output<UnifiedPaymentChannel>();

     explorerUrl = this.txUiService.explorerUrl;

     emptyStateMessage(): string {
          const info = this.viewModel.infoData();
          const count = info?.channelCount || 0;

          if (count > 0) return '';

          const activeTab = this.viewModel.activeTab();
          const isCreatorMode = info?.isCreatorMode;

          switch (activeTab) {
               case 'claimPaymentChannel':
                    return isCreatorMode ? 'This wallet has no payment channels to generate signatures for.' : 'This wallet has no payment channels with claimable funds.';
               case 'renewPaymentChannel':
                    return 'This wallet has no payment channels to renew.';
               case 'closePaymentChannel':
                    return 'This wallet has no payment channels to close.';
               case 'fundPaymentChannel':
                    return 'This wallet has no payment channels to fund.';
               case 'createPaymentChannel':
                    return 'This wallet has not created any payment channels.';
               default:
                    return 'No payment channels found.';
          }
     }

     onPaymentChannelClick(channel: UnifiedPaymentChannel) {
          this.paymentChannelSelected.emit(channel);

          const currentTab = this.viewModel.activeTab();
          if (currentTab != 'createPaymentChannel') {
               this.toggleInfoPanel.emit();
          }
     }
}
