import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
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

@Component({
     selector: 'app-regular-key',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, TransactionOptionsComponent],
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

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     regularKeyAddressValid(): boolean {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!xrpl.isValidAddress(address);
     }

     regularKeyAddressInvalid(): boolean {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!address && !this.regularKeyAddressValid();
     }

     regularKeySeedValid(): boolean {
          const seed = this.accountConfiguratorStoreService.regularKeySeed();
          return xrpl.isValidSecret(seed);
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

     clearFields() {
          this.accountConfiguratorStoreService.setField('regularKeyAddress', '');
          this.accountConfiguratorStoreService.setField('regularKeySeed', '');
          return;
     }
}
