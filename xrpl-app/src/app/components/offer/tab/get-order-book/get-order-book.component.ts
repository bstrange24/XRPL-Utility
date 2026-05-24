import { Component, inject, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'app-get-order-book',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, LucideAngularModule, NgIcon],
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

     // Helper Items
     readonly takerGetsCurrencyHelperItems = AppConstants.TAKER_GETS_CURRENCY_HELPER_ITEMS;
     readonly takerPaysCurrencyHelperItems = AppConstants.TAKER_PAYS_CURRENCY_HELPER_ITEMS;
     readonly takerGetsIssuerHelperItems = AppConstants.TAKER_GETS_ISSUER_HELPER_ITEMS;
     readonly takerPaysIssuerHelperItems = AppConstants.TAKER_PAYS_ISSUER_HELPER_ITEMS;

     // UI Signals
     showTakerGetsCurrencyHelper = signal(false);
     showTakerPaysCurrencyHelper = signal(false);
     showTakerGetsIssuerHelper = signal(false);
     showTakerPaysIssuerHelper = signal(false);

     // Toggle Methods
     toggleTakerGetsCurrencyHelper() {
          this.showTakerGetsCurrencyHelper.set(!this.showTakerGetsCurrencyHelper());
     }

     toggleTakerPaysCurrencyHelper() {
          this.showTakerPaysCurrencyHelper.set(!this.showTakerPaysCurrencyHelper());
     }

     toggleTakerGetsIssuerHelper() {
          this.showTakerGetsIssuerHelper.set(!this.showTakerGetsIssuerHelper());
     }

     toggleTakerPaysIssuerHelper() {
          this.showTakerPaysIssuerHelper.set(!this.showTakerPaysIssuerHelper());
     }
}
