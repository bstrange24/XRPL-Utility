import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { LucideAngularModule } from 'lucide-angular';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { PaymentChannelValidatorService } from '../../../../services/shared/validators/payment-channel-validator/payment-channel-validator.service';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-payment-channel-fund',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, FocusBorderDirective, LucideAngularModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, ToggleSliderComponent],
     templateUrl: './payment-channel-fund.component.html',
     styleUrl: './payment-channel-fund.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelFundComponent {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly paymentChannelValidatorService = inject(PaymentChannelValidatorService);

     // Inputs from parent
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canFundPaymentChannelChange = output<boolean>();

     private optionsHasError = signal(false);
     private optionsErrorMsg = signal('');
     private optionsErrors = signal<string[]>([]);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canFundPaymentChannelChange.emit(this.canFundPaymentChannel());
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

     onOptionsToggled(enabled: boolean) {
          this.txUiService.toggleOptions(enabled);
          this.optionsToggled.emit(enabled);
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     canFundPaymentChannel = computed(() => {
          if (!this.amountValidatorService.isPaymentChannelAmountValid()) return false;
          if (this.wantsOptions() && this.optionsHasError()) return false;

          if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.paymentChannelStoreService.paymentChannelCancelAfterTimeField()) {
               if (this.paymentChannelValidatorService.hasInvalidPaymentChannelExpiration()) {
                    return false;
               }
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (this.amountValidatorService.isPaymentChannelAmountInvalid()) {
               errors.push('Amount must be greater than 0.');
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
}
