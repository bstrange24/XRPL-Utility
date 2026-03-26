import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectSearchDropdownComponent } from '../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TrustlinesComponent } from '../../trustlines/trustlines.component';
import { TrustlineViewModelService } from '../../../services/trustlines/trustline-view-model/trustline-view-model.service';

@Component({
     selector: 'app-currency-form-section',
     standalone: true,
     imports: [CommonModule, SelectSearchDropdownComponent],
     templateUrl: './currency-form-section.component.html',
     styleUrl: './currency-form-section.component.css',
     changeDetection: ChangeDetectionStrategy.Default,
})
export class CurrencyFormSectionComponent implements OnChanges {
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     public readonly cdr = inject(ChangeDetectorRef);
     public readonly trustlinesComponent = inject(TrustlinesComponent);

     @Input() layout: 'split' | 'paired' = 'paired';
     @Input() currencyItems: any[] = [];
     @Input() issuerItems: any[] = [];
     @Input() selectedCurrency: any;
     @Input() selectedIssuer: any;
     @Input() amount!: number | string;
     @Input() currencyBalance!: string;
     @Input() activeTab: 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers' | 'create' | 'cash' | 'cancel' = 'setTrustline';
     @Input() trustlineAlreadyExist: boolean = false;
     @Input() isReadOnly: boolean = false;

     @Output() currencyChange = new EventEmitter<any>();
     @Output() issuerChange = new EventEmitter<any>();
     @Output() amountChange = new EventEmitter<number>();

     constructor() {}

     get limitLabel(): string {
          const tab = this.activeTab ?? 'setTrustline';
          const exist = !!this.trustlineAlreadyExist;

          if (tab === 'setTrustline') {
               return exist ? 'Current Trustline Limit' : 'New Trustline Limit';
          }

          if (tab === 'removeTrustline') {
               return 'Current Limit';
          }

          return 'Token Amount';
     }

     ngOnChanges(_changes: SimpleChanges) {
          // Always mark when any tracked input changes
          this.cdr.markForCheck();
     }

     onAmountInput(event: Event) {
          const input = event.target as HTMLInputElement;
          const numericValue = Number(input.value);

          if (!Number.isFinite(numericValue) || numericValue < 0) {
               return;
          }

          this.amountChange.emit(numericValue);
     }
}
