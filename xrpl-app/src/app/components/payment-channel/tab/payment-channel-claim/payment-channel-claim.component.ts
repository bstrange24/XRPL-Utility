import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { PaymentChannelValidatorService } from '../../../../services/shared/validators/payment-channel-validator/payment-channel-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-payment-channel-claim',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './payment-channel-claim.component.html',
     styleUrl: './payment-channel-claim.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelClaimComponent {
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly paymentChannelValidatorService = inject(PaymentChannelValidatorService);

     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     // Inputs from parent
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canClaimPaymentChannelChange = output<boolean>();

     private optionsHasError = signal(false);
     private optionsErrorMsg = signal('');
     private optionsErrors = signal<string[]>([]);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canClaimPaymentChannelChange.emit(this.canClaimPaymentChannel());
          });
     }
     toggleCreatorMode(isChecked: boolean): void {
          this.paymentChannelStoreService.setField('isCreatorMode', isChecked);
     }

     async generateCreatorClaimSignature(): Promise<void> {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet) return;
          await this.paymentChannelUtilService.generateCreatorClaimSignature(wallet);
     }

     canClaimPaymentChannel = computed(() => {
          if (!this.amountValidatorService.isPaymentChannelAmountValid()) return false;
          if (!this.paymentChannelStoreService.isCreatorMode() && !this.paymentChannelValidatorService.isValidClaimSignature()) return false;
          if (this.wantsOptions() && this.optionsHasError()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (this.amountValidatorService.isPaymentChannelAmountInvalid()) {
               errors.push('Amount must be greater than 0.');
          }

          // if (!this.paymentChannelStoreService.isCreatorMode() && !this.paymentChannelValidatorService.isValidClaimSignature()) {
          //      errors.push('Signature required.');
          // }

          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }
}
