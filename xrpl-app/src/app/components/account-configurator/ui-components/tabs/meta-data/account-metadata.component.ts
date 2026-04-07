import { Component, computed, inject, input, output } from '@angular/core';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as xrpl from 'xrpl';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-account-metadata',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule],
     templateUrl: './account-metadata.component.html',
     styleUrl: './account-metadata.component.css',
})
export class AccountMetadataComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     // Computed signal: the final hex that will be sent
     readonly domainHex = computed(() => {
          const input = this.accountConfiguratorStoreService.domain()?.trim() ?? '';
          if (!input) return '';

          // If already hex → keep it (and uppercase for consistency)
          if (/^[0-9A-Fa-f]+$/.test(input)) {
               return input.toUpperCase();
          }

          // Otherwise convert string to hex
          return xrpl.convertStringToHex(input);
     });

     // Computed: length in bytes (hex chars / 2)
     readonly domainHexLengthBytes = computed(() => {
          const hex = this.domainHex();
          return hex ? Math.ceil(hex.length / 2) : 0;
     });

     // Optional: is the domain too long?
     readonly isDomainTooLong = computed(() => this.domainHexLengthBytes() > 256);

     // Helper method for the template if you prefer calling a function
     domainToHex(value: string): string {
          if (!value) return '';
          if (/^[0-9A-Fa-f]+$/.test(value)) return value.toUpperCase();
          return xrpl.convertStringToHex(value);
     }
}
