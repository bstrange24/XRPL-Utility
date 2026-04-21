import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-payment-channel-requirements-info',
     imports: [NgIcon],
     templateUrl: './payment-channel-requirements-info.component.html',
     styleUrl: './payment-channel-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelRequirementsInfoComponent {
     activeTab = input.required<'createPaymentChannel'>();

     // Collapsible state
     isExpanded = signal(false);
}
