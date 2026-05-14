import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-send-xrp-summary',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './send-xrp-summary.component.html',
     styleUrl: './send-xrp-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpSummaryComponent {
     info = input.required<string | null>();

     tab = input<'sendXrp'>('sendXrp');
     summaryMessage = input<string>('');
     infoPanelExpanded = input<boolean>(false);
     readonly searchQuery = signal<string>('');

     toggleInfoPanel = output<void>();
     resetTrigger = input<number>(0);

     clearSearch() {
          this.searchQuery.set('');
     }
}
