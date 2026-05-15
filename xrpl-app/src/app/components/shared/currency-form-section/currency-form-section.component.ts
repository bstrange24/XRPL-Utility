import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectSearchDropdownComponent } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { TrustlineViewModelService } from '../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';
import { FocusBorderDirective } from '../../../services/shared/focus-border/focus-border.directive';
import { UtilsService } from '../../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-currency-form-section',
     standalone: true,
     imports: [CommonModule, LucideAngularModule, FocusBorderDirective, SelectSearchDropdownComponent],
     templateUrl: './currency-form-section.component.html',
     styleUrl: './currency-form-section.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyFormSectionComponent {
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     private readonly toastService = inject(ToastService);
     public readonly utilsService = inject(UtilsService);

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
     @Output() validationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();

     // Validation signals - make these public for template access
     public isCurrencyValid = signal(true);
     public isIssuerValid = signal(true);
     public isAmountTouched = signal(false);
     private amountValue = signal<number>(0);

     constructor() {
          // Initialize amount value
          effect(() => {
               const amt = typeof this.amount === 'number' ? this.amount : Number(this.amount);
               if (!isNaN(amt)) {
                    this.amountValue.set(amt);
               }
          });

          // Emit overall validation status
          effect(() => {
               const isValid = this.isCurrencyValid() && this.isIssuerValid() && !this.isAmountInvalid();
               const errors = this.getValidationErrors();
               this.validationChange.emit({ isValid, errors });
          });
     }

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

     // Helper method to check if amount has value (for template)
     public hasAmountValue(): boolean {
          const amt = this.amountValue();
          return amt > 0;
     }

     // Helper method to get numeric amount for template
     public getNumericAmount(): number {
          return this.amountValue();
     }

     // Currency Code Validation
     onCurrencyChange(item: any) {
          this.currencyChange.emit(item);
     }

     onCurrencyValidationChange(isValid: boolean) {
          this.isCurrencyValid.set(isValid);
     }

     public isCurrencyCodeInvalid = computed(() => {
          if (!this.selectedCurrency?.display) return false;
          return !this.isCurrencyValid();
     });

     public currencyErrorMessage = computed(() => {
          if (!this.selectedCurrency?.display) return '';

          const currency = this.selectedCurrency.display;

          // Check for valid currency format (3-40 characters, alphanumeric)
          if (currency.length < 3) {
               return 'Currency code must be at least 3 characters';
          }
          if (currency.length > 40) {
               return 'Currency code must be 40 characters or less';
          }

          // Check for valid characters (alphanumeric, ., -, _, %, ?, *, @, !, ^, &, ~, <, >, |, {, }, =)
          const validPattern = /^[A-Za-z0-9.\-_%?*@!^&~<>|{}=]+$/;
          if (!validPattern.test(currency)) {
               return 'Currency code contains invalid characters';
          }

          // Check for standard currency codes (3 uppercase letters)
          const standardPattern = /^[A-Z]{3}$/;
          if (standardPattern.test(currency)) {
               return ''; // Valid standard currency
          }

          // For non-standard, check hex format (40 chars)
          if (currency.length === 40 && /^[A-Fa-f0-9]{40}$/.test(currency)) {
               return ''; // Valid hex format
          }

          return 'Invalid currency code format';
     });

     // Issuer Validation
     onIssuerChange(item: any) {
          this.issuerChange.emit(item);
     }

     onIssuerValidationChange(isValid: boolean) {
          this.isIssuerValid.set(isValid);
     }

     public isIssuerInvalid = computed(() => {
          if (!this.selectedIssuer?.id) return false;
          return !this.isIssuerValid();
     });

     // Amount Validation
     onAmountInput(event: Event) {
          const input = event.target as HTMLInputElement;
          let value = input.value;

          // Allow empty or decimal
          if (value === '' || value === '.') {
               this.amountChange.emit(0);
               return;
          }

          const numericValue = Number(value);

          if (!Number.isFinite(numericValue) || numericValue < 0) {
               return;
          }

          // Round to 6 decimal places
          const rounded = Math.round(numericValue * 1000000) / 1000000;
          this.amountValue.set(rounded);
          this.amountChange.emit(rounded);
     }

     onAmountBlur() {
          this.isAmountTouched.set(true);

          // Format the amount to 6 decimal places if valid
          if (this.isAmountValid() && this.amountValue() > 0) {
               const formatted = this.amountValue().toFixed(6);
               this.amountChange.emit(Number(formatted));
          }
     }

     clearAmount() {
          this.amountValue.set(0);
          this.amountChange.emit(0);
          this.isAmountTouched.set(true);
     }

     public isAmountValid = computed(() => {
          const amt = this.amountValue();

          if (this.activeTab === 'removeTrustline') {
               // For remove trustline, amount must be exactly 0
               return amt === 0;
          }

          // For other tabs, amount must be > 0
          return amt > 0 && Number.isFinite(amt);
     });

     public isAmountInvalid = computed(() => {
          if (!this.isAmountTouched()) return false;
          return !this.isAmountValid();
     });

     public amountErrorMessage = computed(() => {
          if (!this.isAmountTouched()) return '';

          const amt = this.amountValue();

          if (this.activeTab === 'removeTrustline') {
               if (amt !== 0) {
                    return 'Balance must be 0 to remove trustline';
               }
               return '';
          }

          if (amt <= 0) {
               return 'Amount must be greater than 0';
          }

          if (!Number.isFinite(amt)) {
               return 'Please enter a valid number';
          }

          return '';
     });

     public getAmountInputClasses(): string {
          const baseClasses = 'w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:border-green-500';

          if (this.isReadOnly) {
               return `${baseClasses} border-gray-100 bg-gray-50 cursor-not-allowed`;
          }

          if (this.isAmountInvalid()) {
               return `${baseClasses} border-red-500 bg-red-50`;
          }

          if (this.isAmountValid() && this.isAmountTouched() && this.amountValue() > 0) {
               return `${baseClasses} border-green-500`;
          }

          return `${baseClasses} border-gray-200`;
     }

     // Helper methods
     copyToClipboard(text: string) {
          navigator.clipboard
               .writeText(text)
               .then(() => {
                    this.toastService.success('Value copied to clipboard', AppConstants.TOAST.SUCCESS);
               })
               .catch(() => {
                    this.toastService.error('Failed to copy value', AppConstants.TOAST.ERROR);
               });
     }

     private getValidationErrors(): string[] {
          const errors: string[] = [];

          if (!this.isCurrencyValid() && this.selectedCurrency?.display) {
               errors.push(`Invalid currency code: ${this.currencyErrorMessage()}`);
          }

          if (!this.isIssuerValid() && this.selectedIssuer?.id) {
               errors.push('Invalid issuer address');
          }

          if (this.isAmountInvalid() && this.isAmountTouched()) {
               errors.push(this.amountErrorMessage());
          }

          return errors;
     }

     // Public method to trigger validation from parent
     public validate(): boolean {
          this.isAmountTouched.set(true);
          return this.isCurrencyValid() && this.isIssuerValid() && this.isAmountValid();
     }
}
