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
import * as xrpl from 'xrpl';
import { AccountConfiguratorUtilService } from '../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-send-xrp-form',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, ToggleSliderComponent, NgIcon],
     templateUrl: './send-xrp-form.component.html',
     styleUrl: './send-xrp-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpFormComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     constructor() {
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
     isAmountFocused = signal(false);
     isDestinationFocused = signal(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
     canSendXrpChange = output<boolean>();

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');

     // Get the final destination address (from dropdown or manual entry)
     getFinalDestination = computed(() => {
          const searchQuery = this.destinationSearchQuery()?.trim() || '';

          // 1. If user is typing something, prioritize the search query (manual entry)
          if (searchQuery) {
               if (xrpl.isValidAddress(searchQuery)) {
                    return searchQuery;
               } else {
                    return null; // invalid typed value
               }
          }

          // 2. Otherwise fall back to selected dropdown item
          const selectedItem = this.selectedDestinationItem();
          if (selectedItem?.id && xrpl.isValidAddress(selectedItem.id)) {
               return selectedItem.id;
          }

          return null;
     });

     // Validation methods
     isDestinationValid = computed(() => {
          const destination = this.getFinalDestination();
          return !!destination && xrpl.isValidAddress(destination);
     });

     isDestinationInvalid = computed(() => {
          const destination = this.getFinalDestination();
          // Only show error if user has entered something (either selected or typed)
          const hasInput = this.selectedDestinationAddress() || this.destinationSearchQuery();
          return hasInput && !this.isDestinationValid();
     });

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

          // Don't show error on untouched empty field
          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);

          return !Number.isFinite(numAmount) || numAmount <= 0;
     });

     // Combined validation for Send button
     canSendXrp = computed(() => {
          // Must have valid destination
          if (!this.isDestinationValid()) return false;

          // Must have valid amount (> 0)
          if (!this.isAmountValid()) return false;

          return this.canSubmit();
     });

     onOptionsValidationChange(validation: { hasError: boolean; message: string }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
     }

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          if (this.isDestinationInvalid()) return true;
          if (this.isAmountInvalid()) return true;
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return true;
          return false;
     });

     // Get validation error message
     validationErrorMessage = computed(() => {
          if (this.isDestinationInvalid()) {
               return 'Destination address is invalid. Please enter a valid XRP address.';
          }
          if (this.isAmountInvalid()) {
               return 'Amount must be a positive number greater than 0.';
          }
          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               return this.optionsErrorMsg();
          }
          return '';
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
