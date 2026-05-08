// deposit-auth.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
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

@Component({
     selector: 'app-deposit-auth',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, TransactionOptionsComponent],
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

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     // Simple validation methods - same as regular key page
     isAddressValid(address: string): boolean {
          if (!address) return false;
          return xrpl.isValidAddress(address);
     }

     isAddressInvalid(address: string): boolean {
          return !!address && !xrpl.isValidAddress(address);
     }

     // Check if any address has a value but is invalid
     hasInvalidAddresses = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => {
               return addr.account && !xrpl.isValidAddress(addr.account);
          });
     });

     // Check if there are any empty addresses
     hasEmptyAddresses = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => !addr.account || addr.account.trim() === '');
     });

     // Check if there are duplicate addresses
     hasDuplicateAddresses = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          const validAddresses = addresses.filter((addr: { account: string }) => addr.account && xrpl.isValidAddress(addr.account)).map((addr: { account: string }) => addr.account);

          return new Set(validAddresses).size !== validAddresses.length;
     });

     // Check if there are any valid addresses
     hasAtLeastOneValidAddress = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();
          return addresses.some((addr: { account: string }) => {
               return addr.account && xrpl.isValidAddress(addr.account);
          });
     });

     // Combined validation for Set Deposit Auth button
     canSetDepositAuth = computed(() => {
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();

          // Must have no empty addresses
          if (this.hasEmptyAddresses()) return false;

          // Must have no invalid addresses
          if (this.hasInvalidAddresses()) return false;

          // Must have at least one valid address
          if (!this.hasAtLeastOneValidAddress()) return false;

          // Must have no duplicates
          if (this.hasDuplicateAddresses()) return false;

          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     // Remove button
     canRemoveDepositAuth = computed(() => {
          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          if (this.hasEmptyAddresses()) return true;
          if (this.hasInvalidAddresses()) return true;
          if (this.hasDuplicateAddresses()) return true;
          return false;
     });

     // Get validation error message
     // Alternative: Show all validation errors
     validationErrorMessages = computed(() => {
          const messages: string[] = [];
          const addresses = this.accountConfiguratorStoreService.depositAuthAddresses();

          // Check for empty addresses
          if (this.hasEmptyAddresses()) {
               const emptyIndices = addresses.map((addr: { account: string }, idx: number) => (!addr.account ? idx + 1 : null)).filter((idx: null) => idx !== null);

               messages.push(`Address${emptyIndices.length > 1 ? 'es' : ''} ${emptyIndices.join(', ')} ${emptyIndices.length > 1 ? 'are' : 'is'} empty.`);
          }

          // Check for invalid addresses
          if (this.hasInvalidAddresses()) {
               const invalidIndices = addresses.map((addr: { account: string }, idx: number) => (addr.account && !xrpl.isValidAddress(addr.account) ? idx + 1 : null)).filter((idx: null) => idx !== null);

               messages.push(`Address${invalidIndices.length > 1 ? 'es' : ''} ${invalidIndices.join(', ')} ${invalidIndices.length > 1 ? 'have' : 'has'} invalid XRP addresses.`);
          }

          // Check for duplicate addresses
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
                    .map(([address, indices]) => `"${address}" (Addresses ${indices.join(', ')})`);

               messages.push(`Duplicate ${duplicates.length === 1 ? 'address' : 'addresses'} detected: ${duplicates.join(', ')}.`);
          }

          return messages;
     });

     // Track by index for better performance
     trackByIndex(index: number, item: any): number {
          return index;
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('depositAuthAddresses', [{ Account: '', seed: '', SignerWeight: 1 }]);
          return;
     }
}
