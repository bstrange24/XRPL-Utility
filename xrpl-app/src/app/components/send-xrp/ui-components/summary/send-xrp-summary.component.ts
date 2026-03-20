import { Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-send-xrp-summary',
     imports: [NgIcon],
     templateUrl: './send-xrp-summary.component.html',
     styleUrl: './send-xrp-summary.component.css',
})
export class SendXrpSummaryComponent {
     // Inputs
     info = input.required<
          | {
                 walletName: string;
            }
          | null
          | undefined
     >();

     tab = input.required<'sendXrp'>();

     summaryMessage = input.required<string>();
     infoPanelExpanded = input.required<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();
}
