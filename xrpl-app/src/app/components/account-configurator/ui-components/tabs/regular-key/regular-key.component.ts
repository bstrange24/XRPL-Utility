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
import * as bip39 from 'bip39';
import { AppConstants } from '../../../../../core/app.constants';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { ButtonTooltipComponent } from '../../../../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-regular-key',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, TransactionOptionsComponent, FieldHelperComponent, ButtonTooltipComponent],
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

     // Add computed property for validation state
     hasValidationErrors = computed(() => {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          const seed = this.accountConfiguratorStoreService.regularKeySeed();

          // If both are empty, no validation errors (user hasn't started)
          if (!address && !seed) return false;

          // Check for invalid address (if address is provided and invalid)
          if (address && !xrpl.isValidAddress(address)) return true;

          // Check for invalid seed (if seed is provided and invalid)
          if (seed && !xrpl.isValidSecret(seed)) return true;

          // Check warning condition: seed valid but address missing
          if (seed && xrpl.isValidSecret(seed) && !address) return true;

          return false;
     });

     // Toggle Method
     toggleRegularKeyHelper() {
          this.showRegularKeyHelper.set(!this.showRegularKeyHelper());
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('regularKeyAddress', '');
          this.accountConfiguratorStoreService.setField('regularKeySeed', '');
          return;
     }
}
