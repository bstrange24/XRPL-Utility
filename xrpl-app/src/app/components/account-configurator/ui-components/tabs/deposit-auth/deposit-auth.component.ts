import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../../../core/app.constants';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { ButtonTooltipComponent } from '../../../../shared/button-tooltip/button-tooltip.component';
import { InputIconsComponent } from '../../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../../shared/validation-errors/validation-errors.component';
import { FocusBorderDirective } from '../../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-deposit-auth',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, LucideAngularModule, NgIcon, TransactionOptionsComponent, FieldHelperComponent, ButtonTooltipComponent, InputIconsComponent, ValidationErrorsComponent],
     templateUrl: './deposit-auth.component.html',
     styleUrl: './deposit-auth.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositAuthComponent {
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly connectionGuard = inject(ConnectionGuardService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     // === Helper Items ===
     readonly depositAuthHelperItems = AppConstants.DEPOSIT_AUTH_HELPER_ITEMS;

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     // UI State
     showDepositAuthHelper = signal(false);
     focusedAddressIndex = signal<number | null>(null);

     // Track user interaction
     hasUserInteracted = signal(false);
     touchedFields = signal<Set<number>>(new Set());

     // Simple validation methods
     isAddressValid(address: string): boolean {
          if (!address) return false;
          return xrpl.isValidAddress(address);
     }

     isAddressInvalid(address: string): boolean {
          return !!address && !xrpl.isValidAddress(address);
     }

     // Track focus and blur
     trackAddressFocus(index: number) {
          this.focusedAddressIndex.set(index);
          this.hasUserInteracted.set(true);
     }

     handleAddressBlur(index: number) {
          this.focusedAddressIndex.set(null);
          this.touchedFields.update(set => {
               const newSet = new Set(set);
               newSet.add(index);
               return newSet;
          });
     }

     // Update address
     updateAddress(index: number, value: string) {
          this.accountConfiguratorStoreService.updateDepositAuthAddress(index, 'account', value);
          this.hasUserInteracted.set(true);
     }

     // Clear address
     clearAddress(index: number) {
          this.accountConfiguratorStoreService.updateDepositAuthAddress(index, 'account', '');
          return '';
     }

     // Remove address
     removeAddress(index: number) {
          this.accountConfiguratorUtilService.removeDepositAuthAddresses(index);
          this.hasUserInteracted.set(true);
     }

     // Add address
     addAddress() {
          this.accountConfiguratorUtilService.addDepositAuthAddresses();
          this.hasUserInteracted.set(true);
     }

     // Check if any address has a value
     hasAnyAddressInput = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => {
               return addr.account && addr.account.trim().length > 0;
          });
     });

     // Check if validation should show
     shouldShowValidation = computed(() => {
          return this.hasAnyAddressInput() || this.hasUserInteracted() || this.touchedFields().size > 0;
     });

     // Check if there are any empty addresses (only show if touched or has input)
     hasEmptyAddresses = computed(() => {
          if (!this.shouldShowValidation()) return false;
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => !addr.account || addr.account.trim() === '');
     });

     // Check if there are invalid addresses
     hasInvalidAddresses = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => {
               return addr.account && !xrpl.isValidAddress(addr.account);
          });
     });

     // Check if there are duplicate addresses
     hasDuplicateAddresses = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          const validAddresses = addresses.filter((addr: { account: string }) => addr.account && xrpl.isValidAddress(addr.account)).map((addr: { account: string }) => addr.account);

          return new Set(validAddresses).size !== validAddresses.length;
     });

     // Check if there are at least one valid address
     hasAtLeastOneValidAddress = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => {
               return addr.account && xrpl.isValidAddress(addr.account);
          });
     });

     // Combined validation for Set Deposit Auth button
     canSetDepositAuth = computed(() => {
          // Must have no empty addresses if user has interacted
          if (this.shouldShowValidation() && this.hasEmptyAddresses()) return false;

          // Must have no invalid addresses
          if (this.hasInvalidAddresses()) return false;

          // Must have at least one valid address
          if (!this.hasAtLeastOneValidAddress()) return false;

          // Must have no duplicates
          if (this.hasDuplicateAddresses()) return false;

          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     // Remove button validation
     canRemoveDepositAuth = computed(() => {
          // For removal, we just need at least one valid address and no invalid ones
          if (this.hasInvalidAddresses()) return false;
          if (!this.hasAtLeastOneValidAddress()) return false;
          if (this.hasDuplicateAddresses()) return false;

          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     // Validation error messages for summary
     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (!this.shouldShowValidation()) {
               return errors;
          }

          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          const touched = this.touchedFields();

          // Check for empty addresses (only if touched or has input)
          addresses.forEach((addr: { account: string }, index: number) => {
               const isTouched = touched.has(index);
               const hasInput = addr.account && addr.account.trim().length > 0;

               if ((isTouched || hasInput || this.hasAnyAddressInput()) && (!addr.account || addr.account.trim() === '')) {
                    errors.push(`Address ${index + 1}: Account address is required.`);
               } else if (addr.account && !xrpl.isValidAddress(addr.account)) {
                    errors.push(`Address ${index + 1}: "${addr.account}" is not a valid XRP address.`);
               }
          });

          // Check for duplicates (show only once if there are duplicates)
          if (this.hasDuplicateAddresses()) {
               const duplicateMap = new Map<string, number[]>();
               addresses.forEach((addr: { account: string }, idx: number) => {
                    if (addr.account && xrpl.isValidAddress(addr.account)) {
                         if (!duplicateMap.has(addr.account)) {
                              duplicateMap.set(addr.account, []);
                         }
                         duplicateMap.get(addr.account)!.push(idx + 1);
                    }
               });

               const duplicates = Array.from(duplicateMap.entries())
                    .filter(([_, indices]) => indices.length > 1)
                    .map(([address, indices]) => `"${address}" (addresses ${indices.join(', ')})`);

               if (duplicates.length > 0) {
                    errors.push(`Duplicate ${duplicates.length === 1 ? 'address' : 'addresses'} detected: ${duplicates.join(', ')}. Each address can only be added once.`);
               }
          }

          return errors;
     });

     // Track by index for better performance
     trackByIndex(index: number, item: any): number {
          return index;
     }

     toggleDepositAuthHelper() {
          this.showDepositAuthHelper.set(!this.showDepositAuthHelper());
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('depositAuthAddresses', [{ account: '' }]);
          this.hasUserInteracted.set(false);
          this.touchedFields.set(new Set());
          this.focusedAddressIndex.set(null);
     }
}
