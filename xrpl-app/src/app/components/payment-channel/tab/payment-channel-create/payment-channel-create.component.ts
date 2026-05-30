import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { PaymentChannelValidatorService } from '../../../../services/shared/validators/payment-channel-validator/payment-channel-validator.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-payment-channel-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, ToggleSliderComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './payment-channel-create.component.html',
     styleUrl: './payment-channel-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelCreateComponent implements OnDestroy {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly paymentChannelValidatorService = inject(PaymentChannelValidatorService);

     readonly optionalFieldsHelperItems = AppConstants.OPTIONAL_FIELDS_HELPER_ITEMS;
     readonly paymentChannelDetailsHelperItems = AppConstants.PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS;
     readonly paymentChannelAmountHelperItems = AppConstants.PAYMENT_CHANNEL_AMOUNT_HELPER_ITEMS;
     readonly settleDelayHelperItems = AppConstants.SETTLE_DELAY_HELPER_ITEMS;
     readonly paymentChannelDestinationHelperItems = AppConstants.PAYMENT_CHANNEL_DESTINATION_HELPER_ITEMS;

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

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

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canCreateCredentialChange = output<boolean>();
     canCreatePaymentChannelChange = output<boolean>();

     // UI State
     isDestinationValid = signal(false);
     showPaymentChannelDetailsHelper = signal(false);
     showPaymentChannelAmountHelper = signal(false);
     showSettleDelayHelper = signal(false);
     showPaymentChannelDestinationHelper = signal(false);
     showOptionalFieldsHelper = signal(false);
     isFocused = signal(false);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreatePaymentChannelChange.emit(this.canCreatePaymentChannel());
          });

          effect(() => {
               const wantsOptions = this.txUiService.wantsOptions();
               if (!wantsOptions) {
                    this.paymentChannelStoreService.setPaymentChannelCancelAfterTime('');
                    this.xrplTxOptionsStore.setIsExpirationEnabled(false);
               }
          });
     }

     ngOnDestroy(): void {
          this.paymentChannelStoreService.setPaymentChannelCancelAfterTime('');
          this.xrplTxOptionsStore.setIsExpirationEnabled(false);
     }

     setSettleDelay(seconds: number) {
          this.paymentChannelStoreService.setField('settleDelay', seconds.toString());
     }

     get amount() {
          return this.paymentChannelStoreService.amount();
     }

     set amount(value: string) {
          this.paymentChannelStoreService.setField('amount', value);
     }

     // Forward events to parent
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     onOptionsToggled(enabled: boolean) {
          this.txUiService.toggleOptions(enabled);
          this.optionsToggled.emit(enabled);
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     canCreatePaymentChannel = computed(() => {
          if (!this.isDestinationValid()) return false;
          if (!this.amountValidatorService.isPaymentChannelAmountValid()) return false;
          if (!this.paymentChannelValidatorService.isSettleDelayValid()) return false;

          if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

          if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.paymentChannelStoreService.paymentChannelCancelAfterTimeField()) {
               // Use the real-time validator
               if (this.paymentChannelValidatorService.hasInvalidPaymentChannelExpiration()) {
                    return false;
               }
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (!this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          if (this.amountValidatorService.isPaymentChannelAmountInvalid()) {
               errors.push('Amount must be greater than 0');
          }

          if (this.paymentChannelValidatorService.isSettleDelayInvalid()) {
               const delay = Number(this.paymentChannelStoreService.settleDelay());
               if (delay > 4294967295) {
                    errors.push('Settle Delay cannot exceed 4,294,967,295 seconds');
               } else {
                    errors.push('Settle Delay must be a valid whole number between 0 and 4,294,967,295');
               }
          }

          // Only show expiration error if wantsOptions is enabled AND expiration is enabled AND expiration has a value
          if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.paymentChannelStoreService.paymentChannelCancelAfterTimeField()) {
               if (this.paymentChannelValidatorService.hasInvalidPaymentChannelExpiration()) {
                    errors.push(this.paymentChannelValidatorService.getPaymentChannelExpirationErrorMessage());
               }
          }

          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     // Toggle Methods
     togglePaymentChannelDetailsHelper() {
          this.showPaymentChannelDetailsHelper.set(!this.showPaymentChannelDetailsHelper());
     }

     toggleAmountHelper() {
          this.showPaymentChannelAmountHelper.set(!this.showPaymentChannelAmountHelper());
     }

     toggleSettleDelayHelper() {
          this.showSettleDelayHelper.set(!this.showSettleDelayHelper());
     }

     toggleDestinationHelper() {
          this.showPaymentChannelDestinationHelper.set(!this.showPaymentChannelDestinationHelper());
     }

     toggleOptionalFieldsHelper() {
          this.showOptionalFieldsHelper.set(!this.showOptionalFieldsHelper());
     }
}
