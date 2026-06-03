import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../../../core/app.constants';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { ButtonTooltipComponent } from '../../../../shared/button-tooltip/button-tooltip.component';
import { InputIconsComponent } from '../../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../../shared/validation-errors/validation-errors.component';
import { FocusBorderDirective } from '../../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-regular-key',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, LucideAngularModule, NgIcon, TransactionOptionsComponent, FieldHelperComponent, ButtonTooltipComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './regular-key.component.html',
     styleUrl: './regular-key.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegularKeyComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     // === Helper Items ===
     readonly regularKeyHelperItems = AppConstants.REGULAR_KEY_HELPER_ITEMS;

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
     isRegularKeyAddressFocused = signal(false);
     isRegularKeySeedFocused = signal(false);

     // UI State
     showRegularKeyHelper = signal(false);

     regularKeyAddressValid = computed(() => {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!xrpl.isValidAddress(address);
     });

     regularKeyAddressInvalid = computed(() => {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!address && !this.regularKeyAddressValid();
     });

     get regularKeyAddress() {
          return this.accountConfiguratorStoreService.regularKeyAddress();
     }

     set regularKeyAddress(value: string) {
          this.accountConfiguratorStoreService.setField('regularKeyAddress', value);
     }

     get regularKeySeed() {
          return this.accountConfiguratorStoreService.regularKeySeed();
     }

     set regularKeySeed(value: string) {
          this.accountConfiguratorStoreService.setField('regularKeySeed', value);
     }

     isMnemonic(secret: string): boolean {
          if (!secret) return false;
          const trimmed = secret.trim();
          return trimmed.includes(' ') && /^[a-z\s]+$/i.test(trimmed);
     }

     regularKeySeedValid(): boolean {
          const secret = this.accountConfiguratorStoreService.regularKeySeed();

          if (!secret || secret.trim().length === 0) {
               return false;
          }

          const trimmedSecret = secret.trim();

          // Check if it's a mnemonic - reject it
          if (trimmedSecret.includes(' ') && /^[a-z\s]+$/i.test(trimmedSecret)) {
               console.warn('Mnemonics are not supported for regular keys. Please use a family seed (starts with "s") or secret numbers.');
               return false;
          }

          // Check if it's secret numbers (contains spaces and digits)
          if (trimmedSecret.includes(' ') && /^[\d\s]+$/.test(trimmedSecret)) {
               return xrpl.isValidSecret(trimmedSecret);
          }

          // Check if it's a family seed (starts with 's' and no spaces)
          if (!trimmedSecret.includes(' ') && trimmedSecret.startsWith('s')) {
               return xrpl.isValidSecret(trimmedSecret);
          }

          return xrpl.isValidSecret(trimmedSecret);
     }

     regularKeySeedInvalid(): boolean {
          const seed = this.accountConfiguratorStoreService.regularKeySeed();
          return !!seed && !this.regularKeySeedValid();
     }

     // Check if Set Regular Key button should be enabled
     canSetRegularKey = computed(() => {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          const seed = this.accountConfiguratorStoreService.regularKeySeed();

          // Need valid address AND valid seed
          const hasValidAddress = !!address && this.regularKeyAddressValid();
          const hasValidSeed = !!seed && this.regularKeySeedValid();

          return this.canSubmit() && this.connectionGuard.isConnectionReady() && hasValidAddress && hasValidSeed;
     });

     // Check if Remove Regular Key button should be enabled
     canRemoveRegularKey = computed(() => {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();

          // Need valid address (seed is optional for removal)
          // If address is provided, it must be valid
          const hasValidAddress = !address || this.regularKeyAddressValid();

          return this.canSubmit() && this.connectionGuard.isConnectionReady() && hasValidAddress;
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          return this.validationErrorMessages().length > 0;
     });

     // Validation error messages for summary
     validationErrorMessages = computed(() => {
          const errors: string[] = [];
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          const seed = this.accountConfiguratorStoreService.regularKeySeed();

          // Check for invalid address (if address is provided and invalid)
          if (address && !xrpl.isValidAddress(address)) errors.push('Regular key address is invalid. Please enter a valid XRP address.');

          // Check for invalid seed (if seed is provided and invalid)
          if (seed && !xrpl.isValidSecret(seed)) errors.push('Regular key seed is invalid. Please enter a valid XRP seed (family seed or secret numbers).');

          if (seed && xrpl.isValidSecret(seed) && !address) errors.push('Regular key address is required when a valid seed is provided.');

          return errors;
     });

     // Toggle Method
     toggleRegularKeyHelper() {
          this.showRegularKeyHelper.set(!this.showRegularKeyHelper());
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('regularKeyAddress', '');
          this.accountConfiguratorStoreService.setField('regularKeySeed', '');
     }
}
