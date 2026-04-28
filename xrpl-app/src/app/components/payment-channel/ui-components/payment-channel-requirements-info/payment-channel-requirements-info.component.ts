import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';

@Component({
     selector: 'app-payment-channel-requirements-info',
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './payment-channel-requirements-info.component.html',
     styleUrl: './payment-channel-requirements-info.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelRequirementsInfoComponent {
     activeTab = input.required<'createPaymentChannel'>();

     // Collapsible state
     isExpanded = signal(false);
}
