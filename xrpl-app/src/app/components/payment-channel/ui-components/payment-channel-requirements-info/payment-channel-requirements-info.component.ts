import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-payment-channel-requirements-info',
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './payment-channel-requirements-info.component.html',
     styleUrl: './payment-channel-requirements-info.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelRequirementsInfoComponent {
     activeTab = input.required<'createPaymentChannel'>();

     // Collapsible state
     isExpanded = signal(false);
}
