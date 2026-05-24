import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../field-helper/field-helper.component';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { AmountValidatorService } from '../../../services/shared/validators/amount-validator/amount-validator.service';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../core/app.constants';

@Component({
     selector: 'app-currency-amount-form',
     imports: [FormsModule, SelectSearchDropdownComponent, NgIcon, LucideAngularModule, FocusBorderDirective, FieldHelperComponent],
     templateUrl: './currency-amount-form.component.html',
     styleUrl: './currency-amount-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyAmountFormComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly amountValidatorService = inject(AmountValidatorService);

     // Helper info items
     readonly currencyCodeHelperItems = AppConstants.CURRENCY_CODE_HELPER_ITEMS;
     readonly amountHelperItems = AppConstants.AMOUNT_HELPER_ITEMS;
     readonly issuerHelperItems = AppConstants.ISSUER_HELPER_ITEMS;

     // UI State
     showCurrencyCodeHelper = signal(false);
     showAmountHelper = signal(false);
     showIssuerHelper = signal(false);

     @Input() currencyItems: SelectItem[] = [];
     @Input() selectedCurrencyItem: SelectItem | null = null;
     @Output() currencySelected = new EventEmitter<SelectItem | null>();

     @Input() amount: string = '';
     @Output() amountChange = new EventEmitter<string | number>();

     @Input() currency: string = 'XRP';
     @Input() issuerItems: SelectItem[] = [];
     @Input() selectedIssuerItem: SelectItem | null = null;
     @Output() issuerSelected = new EventEmitter<SelectItem | null>();

     @Input() balance: string = '';

     @Input() amountLabel = 'Amount';
     @Input() amountHint = 'Amount, in XRP or IOU token, to send to the destination.';
     @Input() amountPlaceholder = 'e.g. 10.5';
     @Input() showAmount = true; // Allows hiding amount if needed in future

     @Input() disableCurrencySelection = false; // ← NEW
     @Input() forceXrpOnly = false; // ← NEW (optional, for future use)
     @Input() showXrpOnlyBadge = false;

     onFocus(event: FocusEvent): void {
          (event.target as HTMLInputElement).select();
     }

     onAmountInput(event: any): void {
          // You can emit to parent or handle locally if needed
          this.amountChange.emit(event.target.value);
     }

     clearAmount(): void {
          this.amount = '';
          this.amountChange.emit('');
     }

     toggleCurrencyCodeHelper() {
          this.showCurrencyCodeHelper.set(!this.showCurrencyCodeHelper());
     }

     toggleAmountHelper() {
          this.showAmountHelper.set(!this.showAmountHelper());
     }

     toggleIssuerHelper() {
          this.showIssuerHelper.set(!this.showIssuerHelper());
     }
}
