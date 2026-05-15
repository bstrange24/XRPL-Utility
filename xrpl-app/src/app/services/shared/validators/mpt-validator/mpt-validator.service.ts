import { computed, inject, Injectable } from '@angular/core';
import { CurrencyStoreService } from '../../../currency/currency-store/currency-store.service';
import { EscrowStoreService } from '../../../escrow/escrow-store/escrow-store.service';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';

@Injectable({
     providedIn: 'root',
})
export class MptValidatorService {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     private readonly expirationValidator = inject(ExpirationValidatorService);

     // MPT Issuance ID Validation
     hasInvalidMptIssuanceId = computed(() => {
          const currency = this.currencyStoreService.currency();
          if (currency !== 'MPT') return false;

          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId || issuanceId.trim().length === 0) return true;

          // MPT Issuance ID should be a 64-character hex string
          const hexRegex = /^[0-9A-Fa-f]{64}$/;
          return !hexRegex.test(issuanceId.trim());
     });

     getMptIssuanceIdErrorMessage = computed(() => {
          if (!this.hasInvalidMptIssuanceId()) return '';
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId || issuanceId.trim().length === 0) {
               return 'MPT Issuance ID is required.';
          }
          return 'MPT Issuance ID must be a 64-character hexadecimal string.';
     });
}
