import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';

@Component({
     selector: 'app-get-order-book',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './get-order-book.component.html',
     styleUrl: './get-order-book.component.css',
})
export class GetOrderBookTabComponent {
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);

     readonly weWantCurrencySelected = output<SelectItem | null>();
     readonly weWantIssuerSelected = output<SelectItem | null>();
     readonly weSpendCurrencySelected = output<SelectItem | null>();
     readonly weSpendIssuerSelected = output<SelectItem | null>();
     readonly invertOrder = output<void>();
}
