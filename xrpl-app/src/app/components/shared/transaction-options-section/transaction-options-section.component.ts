import { ChangeDetectionStrategy, Component, computed, inject, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { CredentialStore } from '../../../services/credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import * as xrpl from 'xrpl';
import { CredentialUtilService } from '../../../services/credentials/credential-util/credential-util.service';
import { XrplExpirationInputComponent } from '../xrpl-expiration-input/xrpl-expiration-input.component';
import { PaymentChannelStoreService } from '../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { ChecksStoreService } from '../../../services/checks/checks-store/checks-store.service';

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     imports: [CommonModule, FormsModule, XrplExpirationInputComponent],
     templateUrl: './transaction-options-section.component.html',
     styleUrl: './transaction-options-section.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionOptionsSectionComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly checksStoreService = inject(ChecksStoreService);

     activeTab = input.required<'sendXrp' | 'createCredential' | 'createPaymentChannel' | 'fundPaymentChannel' | 'acceptCredential' | 'deleteCredential' | 'verifyCredential' | 'cashCheck' | 'cancelCheck' | 'createCheck' | 'deleteAccount' | 'set' | 'delete' | 'accept' | 'verify' | 'setPermissionedDomain' | 'deletePermissionedDomain'>();
     @Input() wantsOptions: boolean = this.txUiService.wantsOptions();

     // Computed signal: the final hex that will be sent
     readonly invoiceIdHex = computed(() => {
          const input = this.xrplTxOptionsStore.invoiceId()?.trim() ?? '';
          if (!input) return '';

          // If already hex → keep it (and uppercase for consistency)
          if (/^[0-9A-Fa-f]+$/.test(input)) {
               return input.toUpperCase();
          }

          // Otherwise convert string to hex
          return xrpl.convertStringToHex(input);
     });

     // Computed: length in bytes (hex chars / 2)
     readonly invoiceIdHexLengthBytes = computed(() => {
          const hex = this.invoiceIdHex();
          return hex ? Math.ceil(hex.length / 2) : 0;
     });

     // Optional: is the domain too long?
     readonly isInvoiceIdTooLong = computed(() => this.invoiceIdHexLengthBytes() > 256);

     // Helper method for the template if you prefer calling a function
     invoiceIdToHex(value: string): string {
          if (!value) return '';
          if (/^[0-9A-Fa-f]+$/.test(value)) return value.toUpperCase();
          return xrpl.convertStringToHex(value);
     }

     onCredentialIDsChange(value: string) {
          this.credentialStore.setField('credentialID', value);

          const parsed = value
               .split(',')
               .map(id => id.trim())
               .filter(Boolean);

          this.credentialStore.setField('credentialIDs', parsed);
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }

     setCheckExpirationDate = (value: string): void => {
          this.checksStoreService.setField('checkExpirationDate', value);
          this.checksStoreService.setField('enableExpirationDate', true);
          alert('Expiration date set to: ' + value);
     };
}
