import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { FormsModule } from '@angular/forms';

@Component({
     selector: 'app-currency-amount-form',
     imports: [FormsModule, SelectSearchDropdownComponent],
     templateUrl: './currency-amount-form.component.html',
     styleUrl: './currency-amount-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyAmountFormComponent {
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
     @Input() amountHint = 'Amount, in XRP or token, to send to the destination. Use arrows for ±0.000001 precision.';
     @Input() amountPlaceholder = 'e.g. 10.5';
     @Input() showAmount = true; // Allows hiding amount if needed in future

     @Input() disableCurrencySelection = false; // ← NEW
     @Input() forceXrpOnly = false; // ← NEW (optional, for future use)
     @Input() showXrpOnlyBadge = false;

     onFocus(event: FocusEvent): void {
          (event.target as HTMLInputElement).select();
     }
}
