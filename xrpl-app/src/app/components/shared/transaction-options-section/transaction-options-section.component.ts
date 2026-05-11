import { ChangeDetectionStrategy, Component, computed, effect, inject, Input, input, output, signal } from '@angular/core';
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
import { FocusBorderDirective } from '../../../services/shared/focus-border/focus-border.directive';
import { NgIcon } from '@ng-icons/core';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, FocusBorderDirective, XrplExpirationInputComponent],
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

     // Computed signal: the final hex that will be sent
     readonly invoiceIdHex = computed(() => {
          const input = this.xrplTxOptionsStore.invoiceId()?.trim() ?? '';
          if (!input) return '';
          if (/^[0-9A-Fa-f]{64}$/i.test(input)) {
               return input.toUpperCase();
          }
          return input;
     });

     isValidInvoiceId = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId()?.trim();
          if (!id) return true;
          return /^[0-9A-Fa-f]{64}$/i.test(id);
     });

     hasInvalidInvoiceId = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId()?.trim();
          if (!id) return false;
          return !/^[0-9A-Fa-f]{64}$/i.test(id);
     });

     invoiceIdHexLength = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId();
          return id?.length || 0;
     });

     // Computed: length in bytes (hex chars / 2)
     readonly invoiceIdHexLengthBytes = computed(() => {
          const hex = this.invoiceIdHex();
          return hex ? Math.ceil(hex.length / 2) : 0;
     });

     readonly isInvoiceIdTooLong = computed(() => this.invoiceIdHexLengthBytes() > 256);

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

     isDestinationTagValid = computed(() => {
          const amount = this.xrplTxOptionsStore.destinationTag();
          if (amount === null || amount === '') return true;
          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isDestinationTagInvalid = computed(() => {
          const amount = this.xrplTxOptionsStore.destinationTag();
          if (amount === null || amount === '') return false;
          const numAmount = parseFloat(amount);
          return isNaN(numAmount) || numAmount <= 0;
     });

     isSourceTagValid = computed(() => {
          const amount = this.xrplTxOptionsStore.sourceTag();
          if (amount === null || amount === '') return true;
          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isSourceTagInvalid = computed(() => {
          const amount = this.xrplTxOptionsStore.sourceTag();
          if (amount === null || amount === '') return false;
          const numAmount = parseFloat(amount);
          return isNaN(numAmount) || numAmount <= 0;
     });

     isUriValid = computed(() => {
          const uri = this.credentialStore.uri()?.trim() ?? '';
          if (!uri) return true;
          return uri.length > 0 && uri.length <= 256;
     });

     hasInvalidUri = computed(() => {
          const uri = this.credentialStore.uri()?.trim() ?? '';
          if (!uri) return false;
          return !this.isUriValid();
     });

     // Credential Expiration Validation
     isCredentialExpirationValid = computed(() => {
          const expiration = this.credentialStore.credentialSubjectExpirationDate();
          if (!expiration) return true;
          const timestamp = Number(expiration);
          if (isNaN(timestamp)) return false;
          const now = Math.floor(Date.now() / 1000);
          return timestamp > now;
     });

     hasInvalidCredentialExpiration = computed(() => {
          const expiration = this.credentialStore.credentialSubjectExpirationDate();
          if (!expiration) return false;
          return !this.isCredentialExpirationValid();
     });

     isDomainIdValid = computed(() => {
          const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';

          // Optional field
          if (!domain) return true;

          // Valid hex string (XRPL hex encoded domain)
          if (/^[0-9A-Fa-f]+$/.test(domain)) {
               return domain.length <= 512;
          }

          // Valid domain name
          const domainRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/;

          return domainRegex.test(domain);
     });

     hasInvalidDomainId = computed(() => {
          const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';
          if (!domain) return false;
          return !this.isDomainIdValid();
     });

     isCredentialIDsValid = computed(() => {
          const ids = this.credentialStore.credentialIDs();
          if (!ids || ids.length === 0) return true;

          // Each credential ID should be non-empty and reasonable length
          return ids.every(id => {
               const trimmed = id?.trim();
               return trimmed && trimmed.length > 0 && trimmed.length <= 256;
          });
     });

     hasInvalidCredentialIDs = computed(() => {
          const ids = this.credentialStore.credentialIDs();
          if (!ids || ids.length === 0) return false;
          return !this.isCredentialIDsValid();
     });

     hasInvalidCredentialIds = computed(() => {
          const ids = this.credentialStore.credentialIDs();
          return ids.some(id => !id || id.trim().length === 0 || id.length > 256);
     });

     credentialIdsAsString = computed(() => {
          return this.credentialStore.credentialIDs().join('\n');
     });

     updateCredentialIdsFromString(event: Event) {
          const textarea = event.target as HTMLTextAreaElement;
          const value = textarea.value;

          // Split by newlines, commas, or spaces
          const ids = value
               .split(/[\n,]+/)
               .map(id => id.trim())
               .filter(id => id.length > 0 && id.length <= 256);

          // Remove duplicates while preserving order
          const uniqueIds = [...new Map(ids.map(id => [id, id])).values()];

          this.credentialStore.setField('credentialIDs', uniqueIds);
     }

     isCredentialIdInvalid = (id: string): boolean => {
          const trimmed = id?.trim();

          if (!trimmed) return true;

          return !/^[A-Fa-f0-9]{64}$/.test(trimmed);
     };

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
               this.removeCredentialId(index);
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

     removeCredentialId(index: number) {
          const currentIds = this.credentialStore.credentialIDs();
          const updatedIds = currentIds.filter((_, i) => i !== index);
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
               if (this.hasInvalidUri()) {
                    const uri = this.credentialStore.uri()?.trim() ?? '';
                    if (uri.length > 256) {
                         errors.push('URI exceeds 256 character limit');
                    } else {
                         errors.push('Please enter a valid URI');
                    }
               }

               if (this.hasInvalidCredentialExpiration()) {
                    errors.push('Credential expiration must be a valid future date');
               }
          }

          // Send XRP Tab
          if (currentTab === 'sendXrp') {
               if (this.hasInvalidDomainId()) {
                    const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';
                    if (/^[0-9A-Fa-f]+$/i.test(domain)) {
                         errors.push(`Domain ID hex exceeds 512 character limit (256 bytes). Got ${domain.length} chars`);
                    } else {
                         errors.push('Domain ID must be a valid domain name (example.com) or hex string (max 512 chars)');
                    }
               }

               if (this.hasInvalidCredentialIDs()) {
                    errors.push('Credential IDs must be valid 64-character hexadecimal values');
               }

               if (!this.isDestinationTagValid()) {
                    errors.push('Destination Tag must be a positive number');
               }
               if (!this.isSourceTagValid()) {
                    errors.push('Source Tag must be a positive number');
               }
               if (this.isEnteredCredentialIdInvalid()) {
                    errors.push('New Credential ID must be a valid 64-character hexadecimal Credential ID');
               }
          }

          // Invoice ID (Multiple tabs)
          if (currentTab === 'sendXrp' || currentTab === 'createCheck' || currentTab === 'createPaymentChannel') {
               if (this.hasInvalidInvoiceId()) {
                    errors.push(`Invoice ID must be exactly 64 hex characters (32 bytes). Got ${this.invoiceIdHexLength()} characters.`);
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
