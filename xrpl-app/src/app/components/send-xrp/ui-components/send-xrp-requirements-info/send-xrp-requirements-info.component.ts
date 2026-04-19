import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
     selector: 'app-send-xrp-requirements-info',
     imports: [NgIcon],
     templateUrl: './send-xrp-requirements-info.component.html',
     styleUrl: './send-xrp-requirements-info.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpRequirementsInfoComponent {
     activeTab = input.required<'sendXrp'>();

     // Collapsible state
     isExpanded = signal(false); // ← Fixed: Added this signal
}
