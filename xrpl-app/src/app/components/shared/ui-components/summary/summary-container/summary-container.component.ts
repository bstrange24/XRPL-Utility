import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-summary-container',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './summary-container.component.html',
     styleUrl: './summary-container.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryContainerComponent {
     // Core inputs
     walletName = input<string>('');
     summaryText = input<string>('');
     itemCount = input<number>(0);
     loading = input<boolean>(false);

     // Optional features
     links = input<string | null>(null);
     showExpandButton = input<boolean>(true);
     buttonLabel = input<string>('items');
     emptyStateMessage = input<string>('No items found.');
     emptyStateSubMessage = input<string>('');

     // Expansion state
     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();

     // Custom header template
     headerContent = input<TemplateRef<any> | null>(null);
}
