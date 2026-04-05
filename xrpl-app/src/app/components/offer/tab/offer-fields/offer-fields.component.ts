import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { CreateOfferTabComponent } from '../create-offer/create-offer.component';
import { GetOrderBookTabComponent } from '../get-order-book/get-order-book.component';
import { CancelOfferTabComponent } from '../cancel-offer/cancel-offer.component';

@Component({
     selector: 'app-offer-fields',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, CreateOfferTabComponent, GetOrderBookTabComponent, CancelOfferTabComponent],
     templateUrl: './offer-fields.component.html',
     styleUrl: './offer-fields.component.css',
})
export class OfferFieldsComponent {
     public readonly view = inject(OfferTransactionViewModelService);

     readonly tab = input.required<string>();

     readonly weWantCurrencySelected = output<SelectItem | null>();
     readonly weWantIssuerSelected = output<SelectItem | null>();
     readonly weSpendCurrencySelected = output<SelectItem | null>();
     readonly weSpendIssuerSelected = output<SelectItem | null>();
     readonly weWantAmountChange = output<void>();
     readonly weSpendAmountChange = output<void>();
     readonly invertOrder = output<void>();
}
