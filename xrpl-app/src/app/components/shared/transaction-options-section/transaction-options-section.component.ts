import { ChangeDetectionStrategy, Component, computed, effect, inject, Input, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { CredentialStore } from '../../../services/credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { CredentialUtilService } from '../../../services/credentials/credential-util/credential-util.service';
import { XrplExpirationInputComponent } from '../xrpl-expiration-input/xrpl-expiration-input.component';
import { PaymentChannelStoreService } from '../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { ChecksStoreService } from '../../../services/checks/checks-store/checks-store.service';
import { FocusBorderDirective } from '../../../services/shared/focus-border/focus-border.directive';
import { NgIcon } from '@ng-icons/core';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';
import { LucideAngularModule } from 'lucide-angular';
import { TagValidatorService } from '../../../services/shared/validators/tag-validator/tag-validator.service';
import { InvoiceIdValidatorService } from '../../../services/shared/validators/invoice-id-validator/invoice-id-validator.service';
import { UriValidatorService } from '../../../services/shared/validators/uri-validator/uri-validator.service';
import { DomainIdValidatorService } from '../../../services/shared/validators/domain-id-validator/domain-id-validator.service';
import { CredentialValidatorService } from '../../../services/shared/validators/credential-validator/credential-validator.service';
import { PaymentChannelValidatorService } from '../../../services/shared/validators/payment-channel-validator/payment-channel-validator.service';
import { CheckValidatorService } from '../../../services/shared/validators/check-validator/check-validator.service';

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, FocusBorderDirective, LucideAngularModule, XrplExpirationInputComponent],
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
     public readonly toastService = inject(ToastService);
     public readonly tagValidatorService = inject(TagValidatorService);
     public readonly invoiceIdValidatorService = inject(InvoiceIdValidatorService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly domainIdValidatorService = inject(DomainIdValidatorService);
     public readonly credentialValidatorService = inject(CredentialValidatorService);
     public readonly paymentChannelValidatorService = inject(PaymentChannelValidatorService);
     public readonly checkValidatorService = inject(CheckValidatorService);

     activeTab = input.required<'sendXrp' | 'createCredential' | 'createPaymentChannel' | 'fundPaymentChannel' | 'acceptCredential' | 'deleteCredential' | 'verifyCredential' | 'cashCheck' | 'cancelCheck' | 'createCheck' | 'deleteAccount' | 'set' | 'delete' | 'accept' | 'verify' | 'setPermissionedDomain' | 'deletePermissionedDomain'>();
     @Input() wantsOptions: boolean = this.txUiService.wantsOptions();
     optionsValidationChange = output<{
          hasError: boolean;
          message: string;
          errors: string[];
     }>();

     isDestinationTagFocused = signal(false);
     isSourceTagFocused = signal(false);
     isInvoiceIdFocused = signal(false);
     newCredentialId = signal('');

     constructor() {
          effect(() => {
               this.optionsValidationChange.emit({
                    hasError: this.hasOptionsValidationError(),
                    message: this.optionsErrorMessage(),
                    errors: this.optionsErrorMessages(),
               });
          });
     }

     isEnteredCredentialIdInvalid = (): boolean => {
          const id = this.newCredentialId().trim();

          // Empty field should not show invalid state
          if (!id) return false;

          return !/^[A-Fa-f0-9]{64}$/.test(id);
     };

     canAddCredentialId = computed(() => {
          const id = this.newCredentialId().trim();

          if (!id) return false;

          return !this.isEnteredCredentialIdInvalid();
     });

     addCredentialId() {
          const newId = this.newCredentialId().trim();

          if (!newId || newId.length === 0 || newId.length > 256) {
               return;
          }

          if (this.credentialStore.credentialIDs().includes(newId)) {
               this.toastService.warn('Credential ID has already been added.', AppConstants.TOAST.WARN);
               return;
          }

          const currentIds = this.credentialStore.credentialIDs();
          this.credentialStore.setField('credentialIDs', [...currentIds, newId]);
          this.newCredentialId.set('');
     }

     updateCredentialId(index: number, event: Event) {
          const input = event.target as HTMLInputElement;
          let newValue = input.value.trim();

          if (newValue.length > 256) {
               newValue = newValue.slice(0, 256);
               input.value = newValue;
          }

          if (newValue === '') {
               this.credentialValidatorService.removeCredentialId(index);
               return;
          }

          const currentIds = this.credentialStore.credentialIDs();
          if (currentIds.some((id, i) => i !== index && id === newValue)) {
               return;
          }

          const updatedIds = [...currentIds];
          updatedIds[index] = newValue;
          this.credentialStore.setField('credentialIDs', updatedIds);
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }

     setCheckExpirationDate = (value: string): void => {
          this.checksStoreService.setField('checkExpirationDate', value);
          this.checksStoreService.setField('enableExpirationDate', true);
     };

     optionsErrorMessages = computed(() => {
          const errors: string[] = [];
          const currentTab = this.activeTab();

          // Create Credential Tab
          if (currentTab === 'createCredential') {
               if (this.uriValidatorService.hasInvalidUri()) {
                    const uri = this.credentialStore.uri()?.trim() ?? '';
                    if (uri.length > 256) {
                         errors.push(`URI exceeds 256 character limit (currently ${uri.length} characters)`);
                    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
                         errors.push('Please enter a valid URL (e.g., https://example.com/credential)');
                    } else {
                         errors.push('Please enter a valid URI format');
                    }
               }

               if (this.credentialValidatorService.hasInvalidCredentialExpiration()) {
                    // Use the more descriptive error message
                    errors.push(this.credentialValidatorService.getCredentialExpirationErrorMessage());
               }

               if (this.paymentChannelValidatorService.hasInvalidPaymentChannelExpiration()) {
                    // Use the more descriptive error message
                    errors.push(this.paymentChannelValidatorService.getPaymentChannelExpirationErrorMessage());
               }
          }

          // Send XRP Tab
          if (currentTab === 'sendXrp') {
               if (this.domainIdValidatorService.hasInvalidDomainId()) {
                    const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';
                    if (/^[0-9A-Fa-f]+$/i.test(domain)) {
                         errors.push(`Domain ID hex exceeds 512 character limit (256 bytes). Got ${domain.length} chars`);
                    } else {
                         errors.push('Domain ID must be a valid domain name (example.com) or hex string (max 512 chars)');
                    }
               }

               if (this.credentialValidatorService.hasInvalidCredentialIDs()) {
                    errors.push('Credential IDs must be valid 64-character hexadecimal values');
               }

               if (!this.tagValidatorService.isDestinationTagValid()) {
                    errors.push('Destination Tag must be a positive number');
               }
               if (!this.tagValidatorService.isSourceTagValid()) {
                    errors.push('Source Tag must be a positive number');
               }
               if (this.isEnteredCredentialIdInvalid()) {
                    errors.push('New Credential ID must be a valid 64-character hexadecimal Credential ID');
               }
          }

          if (currentTab === 'deleteAccount') {
               if (!this.tagValidatorService.isDestinationTagValid()) {
                    errors.push('Destination Tag must be a positive number');
               }
               if (!this.tagValidatorService.isSourceTagValid()) {
                    errors.push('Source Tag must be a positive number');
               }
          }

          // Invoice ID (Multiple tabs)
          if (currentTab === 'sendXrp' || currentTab === 'createCheck' || currentTab === 'createPaymentChannel') {
               if (this.invoiceIdValidatorService.hasInvalidInvoiceId()) {
                    errors.push(`Invoice ID must be exactly 64 hex characters (32 bytes). Got ${this.invoiceIdValidatorService.invoiceIdHexLength()} characters.`);
               }
          }

          return errors;
     });

     optionsErrorMessage = computed(() => {
          return this.optionsErrorMessages().join(', ');
     });

     hasOptionsValidationError = computed(() => {
          return this.optionsErrorMessages().length > 0;
     });
}
