import { computed, inject, Injectable } from '@angular/core';
import { CredentialStore } from '../../../credentials/credential-store/credential-store.service';
import { CREDENTIAL_TYPE_VALADATION } from '../../../../components/credentials/constants/credential.constants';
import { CredentialUtilService } from '../../../credentials/credential-util/credential-util.service';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';

@Injectable({
     providedIn: 'root',
})
export class CredentialValidatorService {
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     private readonly expirationValidator = inject(ExpirationValidatorService);

     isCredentialExpirationValid = computed(() => {
          const expiration = this.credentialStore.credentialSubjectExpirationDate();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidCredentialExpiration = computed(() => {
          const expiration = this.credentialStore.credentialSubjectExpirationDate();
          if (!expiration) return false;
          return !this.isCredentialExpirationValid();
     });

     getCredentialExpirationErrorMessage = computed(() => {
          const expiration = this.credentialStore.credentialSubjectExpirationDate();
          return this.expirationValidator.getErrorMessage(expiration);
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

     onCredentialIDsChange(value: string) {
          this.credentialStore.setField('credentialID', value);

          const parsed = value
               .split(',')
               .map(id => id.trim())
               .filter(Boolean);

          this.credentialStore.setField('credentialIDs', parsed);
     }

     removeCredentialId(index: number) {
          const currentIds = this.credentialStore.credentialIDs();
          const updatedIds = currentIds.filter((_, i) => i !== index);
          this.credentialStore.setField('credentialIDs', updatedIds);
     }

     // Credential Type Validation
     onCredentialTypeInput(event: Event) {
          const input = event.target as HTMLInputElement;
          let value = input.value;

          // Trim whitespace and limit length
          value = value.trim();
          if (value.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               value = value.slice(0, CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH);
               input.value = value;
          }

          this.credentialUtilService.setCredentialType(value);
     }

     isCredentialTypeValid = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return true;
          if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) return false;
          return CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type);
     });

     isCredentialTypeInvalid = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return false; // Don't show error for empty field
          return !this.isCredentialTypeValid();
     });

     credentialTypeErrorMessage = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return '';
          if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               return `Credential type must be ${CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH} characters or less (currently ${type.length})`;
          }
          if (!CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type)) {
               return 'Credential type can only contain letters, numbers, hyphens, and underscores';
          }
          return '';
     });
}
