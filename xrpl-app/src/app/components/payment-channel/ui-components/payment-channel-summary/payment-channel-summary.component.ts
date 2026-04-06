import { Component, inject, input, output, signal } from '@angular/core';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelActionTypes, UnifiedPaymentChannel } from '../../constants/payment-channel.types';

@Component({
     selector: 'app-payment-channel-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './payment-channel-summary.component.html',
     styleUrl: './payment-channel-summary.component.css',
})
export class PaymentChannelSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);

     tab = input.required<PaymentChannelActionTypes>();
     explorerUrl = this.txUiService.explorerUrl;

     readonly infoPanelExpanded = signal<boolean>(false);

     paymentChannelSelected = output<UnifiedPaymentChannel>();

     toggleInfoPanel(): void {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onPaymentChannelClick(channel: UnifiedPaymentChannel) {
          this.paymentChannelSelected.emit(channel);
     }

     canSelectPaymentChannel(_channel: UnifiedPaymentChannel): boolean {
          const activeTab = this.viewModel.infoData()?.activeTab;
          if (!activeTab) return false;

          // On create tab we don't select an existing channel
          if (activeTab === 'createPaymentChannel') {
               return false;
          }

          // All other tabs (fund, claim, renew, close) → selectable
          return true;
     }
}
