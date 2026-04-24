// offer-summary.component.ts
import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

@Component({
     selector: 'app-offer-summary',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './offer-summary.component.html',
     styleUrl: './offer-summary.component.css',
})
export class OfferSummaryComponent {
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly store = inject(OfferStoreService);

     readonly infoPanelExpanded = input.required<boolean>();
     readonly toggleInfoPanel = output<void>();

     getSummaryText(info: any): string {
          if (info.isOrderBookTab) {
               return ` viewing order book for <strong>${info.pair}</strong>`;
          }

          if (info.offerCount === 0) {
               return ` has no outstanding offers.`;
          }

          return ` has <strong>${info.offerCount}</strong> outstanding offer${info.offerCount === 1 ? '' : 's'}.`;
     }

     getButtonLabel(info: any): string {
          if (info.isOrderBookTab) {
               return 'order book';
          }
          return `offer${info.offerCount === 1 ? '' : 's'}`;
     }

     getEmptyStateMessage(): string {
          const activeTab = this.view.activeTab();

          if (activeTab === 'createOffer') {
               return 'This wallet has not created any Offers yet.';
          } else if (activeTab === 'cancelOffer') {
               return 'This wallet has no Offers to cancel.';
          }
          return 'No offers found.';
     }

     onOfferClick(offer: any) {
          // Handle offer click - you can emit or handle as needed
          console.log('Offer clicked:', offer);
     }
}
