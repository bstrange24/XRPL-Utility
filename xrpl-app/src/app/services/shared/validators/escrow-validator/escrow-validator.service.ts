import { computed, inject, Injectable } from '@angular/core';
import { EscrowStoreService } from '../../../escrow/escrow-store/escrow-store.service';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { CurrencyStoreService } from '../../../currency/currency-store/currency-store.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';

@Injectable({
     providedIn: 'root',
})
export class EscrowValidatorService {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     private readonly expirationValidator = inject(ExpirationValidatorService);
     private readonly realTimeService = inject(RealTimeExpirationService);

     // Use real-time signals for expiration validation
     hasInvalidEscrowCancelAfterExpiration = computed(() => {
          const isEnabled = this.escrowStoreService.enableEscrowCancelAfterExpirationDate();
          if (!isEnabled) return false;

          // Use the separate escrow cancel signal
          return this.realTimeService.isEscrowCancelAfterExpired();
     });

     hasInvalidEscrowFinishAfterExpiration = computed(() => {
          const isEnabled = this.escrowStoreService.enableEscrowFinishAfterExpirationDate();
          if (!isEnabled) return false;

          // Use the separate escrow finish signal
          return this.realTimeService.isEscrowFinishAfterExpired();
     });

     getCancelAfterErrorMessage = computed(() => {
          if (!this.hasInvalidEscrowCancelAfterExpiration()) return '';
          const expiration = this.escrowStoreService.escrowCancelAfterExpirationDate();
          if (!expiration) return '';

          const timeRemaining = this.realTimeService.escrowCancelAfterTimeRemaining();
          if (timeRemaining === 'Expired') {
               return `Cancel after time has expired (${new Date(expiration).toLocaleString()}). Please select a future date/time.`;
          }
          return `Cancel after time is invalid. ${timeRemaining}`;
     });

     getFinishAfterErrorMessage = computed(() => {
          if (!this.hasInvalidEscrowFinishAfterExpiration()) return '';
          const expiration = this.escrowStoreService.escrowFinishAfterExpirationDate();
          if (!expiration) return '';

          const timeRemaining = this.realTimeService.escrowFinishAfterTimeRemaining();
          if (timeRemaining === 'Expired') {
               return `Finish after time has expired (${new Date(expiration).toLocaleString()}). Please select a future date/time.`;
          }
          return `Finish after time is invalid. ${timeRemaining}`;
     });

     getTimeRemainingForFinishAfter = computed(() => {
          return this.realTimeService.escrowFinishAfterTimeRemaining();
     });

     getTimeRemainingForCancelAfter = computed(() => {
          return this.realTimeService.escrowCancelAfterTimeRemaining();
     });

     // Condition Validation (PREIMAGE-SHA-256)
     hasInvalidCondition = computed(() => {
          const condition = this.escrowStoreService.condition();
          if (!condition || condition.trim().length === 0) return false;

          // Condition should be a valid hex string (usually 72+ characters for PREIMAGE-SHA-256)
          const hexRegex = /^[0-9A-Fa-f]+$/;
          if (!hexRegex.test(condition.trim())) return true;

          // PREIMAGE-SHA-256 conditions typically have specific length
          // Common lengths: 72, 76, 80 characters
          const length = condition.trim().length;
          return length < 64 || length > 128;
     });

     getConditionErrorMessage = computed(() => {
          if (!this.hasInvalidCondition()) return '';
          const condition = this.escrowStoreService.condition();
          if (!condition || condition.trim().length === 0) return '';
          return 'Invalid condition format. Must be a valid PREIMAGE-SHA-256 crypto-condition hex string.';
     });

     // Fulfillment Validation
     hasInvalidFulfillment = computed(() => {
          const fulfillment = this.escrowStoreService.fulfillment();
          if (!fulfillment || fulfillment.trim().length === 0) return false;

          // Fulfillment should be a valid hex string
          const hexRegex = /^[0-9A-Fa-f]+$/;
          if (!hexRegex.test(fulfillment.trim())) return true;

          // Fulfillment length should be reasonable (typically 64-256 chars)
          const length = fulfillment.trim().length;
          return length < 64 || length > 512;
     });

     getFulfillmentErrorMessage = computed(() => {
          if (!this.hasInvalidFulfillment()) return '';
          const fulfillment = this.escrowStoreService.fulfillment();
          if (!fulfillment || fulfillment.trim().length === 0) return '';
          return 'Invalid fulfillment format. Must be a valid PREIMAGE-SHA-256 crypto-condition fulfillment hex string.';
     });

     // Condition & Fulfillment Pair Validation
     hasInvalidConditionFulfillmentPair = computed(() => {
          const condition = this.escrowStoreService.condition();
          const fulfillment = this.escrowStoreService.fulfillment();

          // If both are empty, it's valid (not using conditional escrow)
          if ((!condition || condition.trim().length === 0) && (!fulfillment || fulfillment.trim().length === 0)) {
               return false;
          }

          // If one is provided but not the other, it's invalid
          if ((condition && condition.trim().length > 0) !== (fulfillment && fulfillment.trim().length > 0)) {
               return true;
          }

          return false;
     });

     getConditionFulfillmentPairErrorMessage = computed(() => {
          if (!this.hasInvalidConditionFulfillmentPair()) return '';
          const hasCondition = this.escrowStoreService.condition() && this.escrowStoreService.condition()!.trim().length > 0;
          const hasFulfillment = this.escrowStoreService.fulfillment() && this.escrowStoreService.fulfillment()!.trim().length > 0;

          if (hasCondition && !hasFulfillment) {
               return 'Fulfillment is required when condition is provided.';
          }
          if (!hasCondition && hasFulfillment) {
               return 'Condition is required when fulfillment is provided.';
          }
          return '';
     });
}
