import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, computed, effect, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectSearchDropdownComponent } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { TrustlineViewModelService } from '../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';
import { FocusBorderDirective } from '../../../services/shared/focus-border/focus-border.directive';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { FieldHelperComponent } from '../field-helper/field-helper.component';
import { FormsModule } from '@angular/forms';
import { AmountValidatorService } from '../../../services/shared/validators/amount-validator/amount-validator.service';
import { InputIconsComponent } from '../input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../validation-errors/validation-errors.component';

@Component({
     selector: 'app-currency-form-section',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, FocusBorderDirective, NgIcon, FieldHelperComponent, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './currency-form-section.component.html',
     styleUrl: './currency-form-section.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyFormSectionComponent implements OnChanges {
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     private readonly toastService = inject(ToastService);
     public readonly utilsService = inject(UtilsService);
     public readonly amountValidatorService = inject(AmountValidatorService);

     @Input() layout: 'split' | 'paired' = 'paired';
     @Input() currencyItems: any[] = [];
     @Input() issuerItems: any[] = [];
     @Input() selectedCurrency: any;
     @Input() selectedIssuer: any;
     @Input() amount!: number | string | null;
     @Input() currencyBalance!: string;
     @Input() activeTab: 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers' | 'create' | 'cash' | 'cancel' = 'setTrustline';
     @Input() trustlineAlreadyExist: boolean = false;
     @Input() isReadOnly: boolean = false;

     @Output() currencyChange = new EventEmitter<any>();
     @Output() issuerChange = new EventEmitter<any>();
     @Output() amountChange = new EventEmitter<number | null>();
     @Output() validationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();

     // Helper Items
     readonly currencyCodeHelperItems = AppConstants.CURRENCY_FORM_CODE_HELPER_ITEMS;
     readonly issuerHelperItems = AppConstants.CURRENCY_FORM_ISSUER_HELPER_ITEMS;
     readonly amountHelperItems = AppConstants.CURRENCY_FORM_AMOUNT_HELPER_ITEMS;
     readonly currencyBalanceHelperItems = AppConstants.CURRENCY_FORM_CURRENCY_BALANCE_HELPER_ITEMS;

     // UI Signals
     showCurrencyCodeHelper = signal(false);
     showIssuerHelper = signal(false);
     showAmountHelper = signal(false);
     showCurrencyBalanceHelper = signal(false);

     // Validation signals - make these public for template access
     public isCurrencyValid = signal(true);
     public isIssuerValid = signal(true);
     public isAmountTouched = signal(false);
     public amountValue = signal<number | null>(null);
     isFocused = signal(false);

     constructor() {
          // Emit overall validation status
          effect(() => {
               const isValid = this.isCurrencyValid() && this.isIssuerValid() && !this.isAmountInvalid();
               const errors = this.getValidationErrors();
               this.validationChange.emit({ isValid, errors });
          });
     }

     ngOnChanges(changes: SimpleChanges): void {
          if (changes['activeTab']) {
               // Reset touched state when tab changes
               this.isAmountTouched.set(false);
          }

          if (changes['amount']) {
               const incoming = this.amount;
               if (incoming === 0 && this.activeTab === 'removeTrustline') {
                    this.amountValue.set(0);
               } else if (typeof incoming === 'number' && !Number.isNaN(incoming)) {
                    this.amountValue.set(incoming);
               } else {
                    this.amountValue.set(null); // empty on load for setTrustline / issue / clawback
               }

               // If external code cleared the amount, reset touched state
               if (incoming === null) {
                    this.isAmountTouched.set(false);
               }
          }
     }

     get limitLabel(): string {
          const tab = this.activeTab ?? 'setTrustline';
          const exist = !!this.trustlineAlreadyExist;

          if (tab === 'setTrustline') {
               return exist ? 'Current Trustline Limit' : 'New Trustline Limit';
          }

          if (tab === 'removeTrustline') {
               return 'Current Trustline Limit';
          }

          return 'Token Amount';
     }

     // Helper method to check if amount has value (for template)
     public hasAmountValue(): boolean {
          const amt = this.amountValue();
          return amt !== null && amt > 0;
     }

     // Helper method to get numeric amount for template
     public getNumericAmount(): number {
          return this.amountValue()!;
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

     onAmountInput(event: Event) {
          const input = event.target as HTMLInputElement;
          const value = input.value.trim();

          // Mark as touched on first user input so validation runs as they type
          if (!this.isAmountTouched()) {
               this.isAmountTouched.set(true);
          }

          if (value === '' || value === '.') {
               this.amountValue.set(null);
               this.amountChange.emit(null);
               return;
          }

          const numeric = Number(value);
          if (!Number.isFinite(numeric) || numeric < 0) return;

          const rounded = Math.round(numeric * 1_000_000) / 1_000_000;
          this.amountValue.set(rounded);
          this.amountChange.emit(rounded);
     }

     onAmountBlur() {
          this.isAmountTouched.set(true);

          // Optional: format to 6 decimals on blur
          const amt = this.amountValue();
          if (amt !== null && this.isAmountValid()) {
               this.amountChange.emit(Number(amt.toFixed(6)));
          }
     }

     clearAmount() {
          this.amountValue.set(null);
          this.amountChange.emit(null);
          this.isAmountTouched.set(false);
     }

     public isAmountValid = computed(() => {
          const amt = this.amountValue();
          if (amt === null) return false; // empty = invalid until touched

          if (this.activeTab === 'removeTrustline') {
               return amt === 0;
          }

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
               return amt === 0 ? '' : 'Balance must be 0 to remove trustline';
          }

          if (amt === null || amt <= 0) {
               return 'Amount must be greater than 0';
          }
          if (!Number.isFinite(amt)) {
               return 'Please enter a valid number';
          }
          return '';
     });

     get getAmount(): number | null {
          return this.amountValue();
     }

     set setAmount(value: number | null | string) {
          if (value === '' || value === null) {
               this.amountValue.set(null);
          } else {
               this.amountValue.set(Number(value));
          }
     }

     public getAmountInputClasses(): string {
          const baseClasses = 'w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:border-green-500';

          if (this.isReadOnly) {
               return `${baseClasses} border-gray-100 bg-gray-50 cursor-not-allowed`;
          }

          if (this.isAmountInvalid()) {
               return `${baseClasses} border-red-500 bg-red-50`;
          }

          if (this.isAmountValid() && this.isAmountTouched() && this.amountValue() !== null) {
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

     public getValidationErrors = computed(() => {
          const errors: string[] = [];

          if (!this.isCurrencyValid() && this.selectedCurrency?.display) {
               errors.push(`Invalid currency code: ${this.currencyErrorMessage()}`);
          }
          if (!this.isIssuerValid() && this.selectedIssuer?.id) {
               errors.push('Invalid issuer address');
          }
          if (this.isAmountInvalid()) {
               const msg = this.amountErrorMessage();
               if (msg) errors.push(msg);
          }

          return errors;
     });

     public validate(): boolean {
          this.isAmountTouched.set(true);
          return this.isCurrencyValid() && this.isIssuerValid() && this.isAmountValid();
     }

     // Toggle Methods
     toggleCurrencyCodeHelper() {
          this.showCurrencyCodeHelper.set(!this.showCurrencyCodeHelper());
     }

     toggleIssuerHelper() {
          this.showIssuerHelper.set(!this.showIssuerHelper());
     }

     toggleAmountHelper() {
          this.showAmountHelper.set(!this.showAmountHelper());
     }

     toggleCurrencyBalanceHelper() {
          this.showCurrencyBalanceHelper.set(!this.showCurrencyBalanceHelper());
     }
}
