import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { NgIcon } from '@ng-icons/core';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-send-xrp-form',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, ToggleSliderComponent, NgIcon],
     templateUrl: './send-xrp-form.component.html',
     styleUrl: './send-xrp-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canSendXrpChange.emit(this.canSendXrp());
          });
     }

     // Inputs from parent
     view = input.required<any>();
     info = input.required<any>();
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();
     selectedDestinationAddress = input<string>();

     // Track destination validation status from dropdown
     isDestinationValid = signal(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
     canSendXrpChange = output<boolean>();

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

     // Simplified validation - just amount and options now
     isAmountValid = computed(() => {
          const amount = this.accountConfiguratorStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isAmountInvalid = computed(() => {
          const amount = this.accountConfiguratorStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return !Number.isFinite(numAmount) || numAmount <= 0;
     });

     canSendXrp = computed(() => {
          // Must have valid destination (from dropdown validation)
          if (!this.isDestinationValid()) return false;

          // Must have valid amount (> 0)
          if (!this.isAmountValid()) return false;

          // Check options validation if enabled
          if (this.wantsOptions() && this.optionsHasError()) return false;

          return true;
     });

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     // Validation error messages for summary
     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Destination error (now handled by dropdown, but we can still show summary)
          if (!this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          // Amount error
          if (this.isAmountInvalid()) {
               errors.push('Amount must be a positive number greater than 0.');
          }

          // Options errors
          if (this.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          return this.validationErrorMessages().length > 0;
     });

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());
}
