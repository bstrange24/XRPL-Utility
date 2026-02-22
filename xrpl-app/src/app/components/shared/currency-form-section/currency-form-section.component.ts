import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectSearchDropdownComponent } from '../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-currency-form-section',
     standalone: true,
     imports: [CommonModule, SelectSearchDropdownComponent],
     templateUrl: './currency-form-section.component.html',
     styleUrl: './currency-form-section.component.css',
})
export class CurrencyFormSectionComponent {
     @Input() layout: 'split' | 'paired' = 'paired';

     @Input() currencyItems: any[] = [];
     @Input() issuerItems: any[] = [];

     @Input() selectedCurrency: any;
     @Input() selectedIssuer: any;

     @Input() amount!: number | string;
     @Input() currencyBalance!: string;

     @Output() currencyChange = new EventEmitter<any>();
     @Output() issuerChange = new EventEmitter<any>();
     @Output() amountChange = new EventEmitter<number>();

     onAmountInput(event: Event) {
          const input = event.target as HTMLInputElement;
          const numericValue = Number(input.value);

          if (!Number.isFinite(numericValue) || numericValue < 0) {
               return;
          }

          this.amountChange.emit(numericValue);
     }
}
