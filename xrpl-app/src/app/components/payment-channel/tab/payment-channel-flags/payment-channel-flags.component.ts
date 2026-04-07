import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { NgIcon } from '@ng-icons/core';
import { PaymentChannelSignatureContextService } from '../../../../services/payment-channel/payment-channel-signature-context/payment-channel-signature-context.service';

@Component({
     selector: 'app-payment-channel-flags',
     standalone: true,
     imports: [CommonModule, LucideAngularModule, NgIcon],
     templateUrl: './payment-channel-flags.component.html',
     styleUrl: './payment-channel-flags.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelFlagsComponent {
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly paymentChannelSignatureContextService = inject(PaymentChannelSignatureContextService);
}
