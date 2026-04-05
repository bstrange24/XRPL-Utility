import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LucideAngularModule } from 'lucide-angular';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';

@Component({
     selector: 'app-offer-summary',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './offer-summary.component.html',
     styleUrl: './offer-summary.component.css',
})
export class OfferSummaryComponent {
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly copyUtilService = inject(CopyUtilService);
     public readonly store = inject(OfferStoreService);

     readonly infoPanelExpanded = input.required<boolean>();
     readonly toggleInfoPanel = output<void>();

     copyAndToast(text: string, label: string = 'Content'): void {
          this.copyUtilService.copyAndToast(text, label);
     }
}
