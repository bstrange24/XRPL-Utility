import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, Input, output, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { CheckValidatorService } from '../../../../services/shared/validators/check-validator/check-validator.service';
import { TagValidatorService } from '../../../../services/shared/validators/tag-validator/tag-validator.service';
import { InvoiceIdValidatorService } from '../../../../services/shared/validators/invoice-id-validator/invoice-id-validator.service';
import { DomainIdValidatorService } from '../../../../services/shared/validators/domain-id-validator/domain-id-validator.service';
import { CredentialValidatorService } from '../../../../services/shared/validators/credential-validator/credential-validator.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'app-checks-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon, ToggleSliderComponent, LucideAngularModule, TransactionOptionsSectionComponent, MatSlideToggleModule],
     templateUrl: './checks-create.component.html',
     styleUrl: './checks-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCreateComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly checkValidatorService = inject(CheckValidatorService);
     public readonly tagValidatorService = inject(TagValidatorService);
     public readonly invoiceIdValidatorService = inject(InvoiceIdValidatorService);
     public readonly domainIdValidatorService = inject(DomainIdValidatorService);
     public readonly credentialValidatorService = inject(CredentialValidatorService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     readonly optionalFieldsHelperItems = AppConstants.OPTIONAL_FIELDS_HELPER_ITEMS;
     readonly checkCurrencyCodeHelperItems = AppConstants.CHECK_CURRENCY_CODE_HELPER_ITEMS;
     readonly checkAmountHelperItems = AppConstants.CHECK_AMOUNT_HELPER_ITEMS;
     readonly checkIssuerHelperItems = AppConstants.CHECK_ISSUER_HELPER_ITEMS;
     readonly checkDestinationHelperItems = AppConstants.CHECK_DESTINATION_HELPER_ITEMS;
     readonly checkCurrencyBalanceHelperItems = AppConstants.CHECK_CURRENCY_BALANCE_HELPER_ITEMS;

     // Inputs from parent
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();
     selectedDestinationAddress = input<string>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     // Track destination validation status from dropdown
     isDestinationValid = signal(false);

     // Outputs to parent
     issuerSelected = output<SelectItem | null>();
     currencySelected = output<SelectItem | null>();
     canCreateCheckChange = output<boolean>();
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canCreateCredentialChange = output<boolean>();

     private isSubjectValid = signal(false);
     private optionsHasError = signal(false);
     private optionsErrorMsg = signal('');
     private optionsErrors = signal<string[]>([]);

     // UI Signals
     showCheckCurrencyCodeHelper = signal(false);
     showCheckAmountHelper = signal(false);
     showCheckIssuerHelper = signal(false);
     showCheckDestinationHelper = signal(false);
     showOptionalFieldsHelper = signal(false);
     showCheckCurrencyBalanceHelper = signal(false);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreateCheckChange.emit(this.canCreateCheck());
          });

          effect(() => {
               const wantsOptions = this.txUiService.wantsOptions();
               if (!wantsOptions) {
                    this.checksStoreService.setCheckExpirationDate('');
                    this.xrplTxOptionsStore.setIsExpirationEnabled(false);
               }
          });
     }

     ngOnDestroy(): void {
          this.checksStoreService.setCheckExpirationDate('');
          this.xrplTxOptionsStore.setIsExpirationEnabled(false);
     }

     public async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     public async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     canCreateCheck = computed(() => {
          if (!this.isDestinationValid()) return false;
          if (this.amountValidatorService.isCheckAmountInvalid()) return false;

          if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

          if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.checksStoreService.checkExpirationDate()) {
               if (this.checkValidatorService.hasInvalidCheckExpiration()) {
                    return false;
               }
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Destination validation
          if (!this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          // Amount validation
          if (this.amountValidatorService.isPaymentChannelAmountInvalid()) {
               errors.push('Amount must be greater than 0.');
          }

          // Options errors from transaction-options-section
          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     // Toggle Methods
     toggleCurrencyCodeHelper() {
          this.showCheckCurrencyCodeHelper.set(!this.showCheckCurrencyCodeHelper());
     }

     toggleAmountHelper() {
          this.showCheckAmountHelper.set(!this.showCheckAmountHelper());
     }

     toggleIssuerHelper() {
          this.showCheckIssuerHelper.set(!this.showCheckIssuerHelper());
     }

     toggleDestinationHelper() {
          this.showCheckDestinationHelper.set(!this.showCheckDestinationHelper());
     }

     toggleOptionalFieldsHelper() {
          this.showOptionalFieldsHelper.set(!this.showOptionalFieldsHelper());
     }

     toggleCurrencyBalanceHelper() {
          this.showCheckCurrencyBalanceHelper.set(!this.showCheckCurrencyBalanceHelper());
     }
}
