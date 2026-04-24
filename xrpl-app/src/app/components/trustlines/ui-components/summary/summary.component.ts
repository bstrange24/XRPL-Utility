import { ChangeDetectionStrategy, Component, inject, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';

@Component({
     selector: 'app-summary',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './summary.component.html',
     styleUrl: './summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryComponent {
     private readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);

     // Inputs
     info = input.required<any>();
     isExpanded = input.required<boolean>();
     explorerUrl = this.txUiService.explorerUrl;
     wallet = input<{ classicAddress?: string; address?: string } | null>();

     // Output
     toggleExpanded = output<void>();

     // Computed summary text
     summaryText = computed(() => {
          const data = this.info();
          if (!data) return '';

          if (data.trustlineCount === 0) {
               return data.emptyMessage || 'No trustlines found.';
          }
          return ` has <strong>${data.trustlineCount}</strong> ${data.countText}`;
     });

     copyIssuer(issuer: string): void {
          this.copyUtilService.copyAndToast(issuer, 'Issuer Address');
     }
}
