import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionOptionsComponent } from '../../../shared/transaction-options/transaction-options.component';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { NgIcon } from '@ng-icons/core';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-account-delete-form',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, TransactionOptionsComponent, NgIcon, LucideAngularModule, ToggleSliderComponent],
     templateUrl: './account-delete-form.component.html',
     styleUrl: './account-delete-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

     view = input.required<any>();
     info = input.required<any>();
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();
     selectedDestinationAddress = input<string>();
     isDestinationValid = signal(false);
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     canDeleteWallet = computed(() => {
          // Must have valid destination (from dropdown validation)
          if (!this.isDestinationValid()) return false;

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

     // Update validation error messages
     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Destination error (now handled by dropdown, but we can still show summary)
          if (!this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          // Options errors
          if (this.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     // Get validation error message
     hasValidationErrors = computed(() => {
          if (!this.isDestinationValid()) return true;
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return true;
          return false;
     });

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());
}
