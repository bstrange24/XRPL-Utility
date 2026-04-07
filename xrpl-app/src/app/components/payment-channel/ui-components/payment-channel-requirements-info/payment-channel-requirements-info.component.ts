import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
     selector: 'app-payment-channel-requirements-info',
     imports: [],
     templateUrl: './payment-channel-requirements-info.component.html',
     styleUrl: './payment-channel-requirements-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelRequirementsInfoComponent {
     isCollapsed = model.required<boolean>();
}
