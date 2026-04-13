import { Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-delegate-summary',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './delegate-summary.component.html',
     styleUrl: './delegate-summary.component.css',
})
export class DelegateSummaryComponent {
     // Main input - the full object from viewModel
     infoData = input<any | null>(null);

     // Optional inputs
     tab = input<'delegateCreate' | 'delegateClear'>('delegateCreate');
     summaryMessage = input<string>(''); // ← Make sure this exists
     infoPanelExpanded = input<boolean>(false);

     toggleInfoPanel = output<void>();

     // Safe message getter
     get message(): string {
          const data = this.infoData();
          return data?.message || this.summaryMessage() || '';
     }
}
