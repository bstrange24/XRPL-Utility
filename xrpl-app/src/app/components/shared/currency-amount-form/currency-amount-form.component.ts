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

     onFocus(event: FocusEvent): void {
          (event.target as HTMLInputElement).select();
     }
}
