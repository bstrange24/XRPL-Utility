import { computed, inject, Injectable } from '@angular/core';
import { EscrowStoreService } from '../../../escrow/escrow-store/escrow-store.service';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { CurrencyStoreService } from '../../../currency/currency-store/currency-store.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';
import { AppConstants } from '../../../../core/app.constants';

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

     getFinishAfterErrorMessage = computed(() => {
          if (!this.hasInvalidEscrowFinishAfterExpiration()) return '';
          return 'Finish After must be a future date/time.';
     });

     getCancelAfterErrorMessage = computed(() => {
          if (!this.hasInvalidEscrowCancelAfterExpiration()) return '';
          return 'Cancel After must be a future date/time.';
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

          // If both are empty, it's valid (creating an escrow with just CancelAfter)
          if ((!condition || condition.trim().length === 0) && (!fulfillment || fulfillment.trim().length === 0)) {
               return false;
          }

          // If condition is provided, it's valid even without fulfillment (for creation)
          // Fulfillment is only needed when finishing the escrow
          if (condition && condition.trim().length > 0 && (!fulfillment || fulfillment.trim().length === 0)) {
               return false; // Valid for creation
          }

          // If fulfillment is provided without condition, that's invalid
          if ((!condition || condition.trim().length === 0) && fulfillment && fulfillment.trim().length > 0) {
               return true;
          }

          // If both are provided, they should form a valid pair (but we can't validate the cryptographic pairing here)
          // The XRPL will validate the pair when finishing the escrow
          return false;
     });

     hasInvalidConditionFulfillmentPair345345345 = computed(() => {
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

     hasMissingFinishAfter = computed(() => this.escrowStoreService.enableEscrowFinishAfterExpirationDate() && !this.escrowStoreService.escrowFinishAfterExpirationDate()?.trim());

     hasMissingCancelAfter = computed(() => this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && !this.escrowStoreService.escrowCancelAfterExpirationDate()?.trim());

     hasMissingTimeBasedExpiration = computed(() => {
          const isConditional = this.escrowStoreService.isConditional?.();
          const enableFinish = this.escrowStoreService.enableEscrowFinishAfterExpirationDate();
          const enableCancel = this.escrowStoreService.enableEscrowCancelAfterExpirationDate();

          console.log('[Validator] hasMissingTimeBasedExpiration:', {
               isConditional,
               enableFinish,
               enableCancel,
               result: !enableFinish && !enableCancel,
               timestamp: new Date().toISOString(),
          });

          if (isConditional ?? false) return false;
          return !enableFinish && !enableCancel;
     });

     getMissingTimeBasedErrorMessage = computed(() => (this.hasMissingTimeBasedExpiration() ? 'Time-based escrow requires at least Finish After or Cancel After to be enabled.' : ''));
     getMissingConditionErrorMessage = computed(() => (this.hasMissingTimeBasedExpiration() ? 'Conditional escrow requires Cancel After to be enabled and a date set.' : ''));

     getMissingExpirationValueErrorMessage = computed(() => {
          if (this.hasMissingFinishAfter()) {
               return 'Finish After is enabled but no date is set.';
          }
          if (this.hasMissingCancelAfter()) {
               return 'Cancel After is enabled but no date is set.';
          }
          return '';
     });

     hasMissingConditionalExpiration = computed(() => {
          const isConditional = this.escrowStoreService.isConditional?.() ?? false;
          if (!isConditional) return false;

          // Conditional escrows MUST have CancelAfter
          const enableCancel = this.escrowStoreService.enableEscrowCancelAfterExpirationDate();
          const cancelDate = this.escrowStoreService.escrowCancelAfterExpirationDate();

          return !enableCancel || !cancelDate?.trim();
     });

     getMissingConditionalExpirationErrorMessage = computed(() => {
          if (!this.hasMissingConditionalExpiration()) return '';
          return 'Conditional escrow requires a Cancel After expiration date.';
     });

     getConditionFulfillmentPairErrorMessage = computed(() => {
          if (!this.hasInvalidConditionFulfillmentPair()) return '';
          const hasCondition = this.escrowStoreService.condition() && this.escrowStoreService.condition().trim().length > 0;
          const hasFulfillment = this.escrowStoreService.fulfillment() && this.escrowStoreService.fulfillment().trim().length > 0;

          if (!hasCondition && hasFulfillment) {
               return 'Fulfillment requires a condition to be set.';
          }
          return 'Invalid condition and fulfillment combination.';
     });

     getConditionFulfillmentPairErrorMessage34534534 = computed(() => {
          if (!this.hasInvalidConditionFulfillmentPair()) return '';
          const hasCondition = this.escrowStoreService.condition() && this.escrowStoreService.condition().trim().length > 0;
          const hasFulfillment = this.escrowStoreService.fulfillment() && this.escrowStoreService.fulfillment().trim().length > 0;

          if (hasCondition && !hasFulfillment) {
               return 'Fulfillment is required when condition is provided.';
          }
          if (!hasCondition && hasFulfillment) {
               return 'Condition is required when fulfillment is provided.';
          }
          return '';
     });

     // Amount Error (only shows when user typed something)
     getAmountErrorMessage = computed(() => {
          const amount = this.escrowStoreService.amount()?.trim() ?? '';

          if (amount === '') return '';

          const num = Number.parseFloat(amount);
          if (num <= 0) {
               return 'Amount must be greater than 0.';
          }
          if (num > AppConstants.MAX_TOKEN_COUNT) {
               return 'Maximum XRP/Tokens cannot exceed 10,000,000,000,000,000.';
          }

          return '';
     });

     // Single source of truth for all validation errors
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const amountErr = this.getAmountErrorMessage();
          if (amountErr) errors.push(amountErr);

          if (this.hasInvalidCondition()) {
               errors.push(this.getConditionErrorMessage());
          }
          if (this.hasInvalidFulfillment()) {
               errors.push(this.getFulfillmentErrorMessage());
          }
          if (this.hasInvalidConditionFulfillmentPair()) {
               errors.push(this.getConditionFulfillmentPairErrorMessage());
          }

          if (this.escrowStoreService.enableEscrowFinishAfterExpirationDate() && this.hasInvalidEscrowFinishAfterExpiration()) {
               errors.push(this.getFinishAfterErrorMessage());
          }
          if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.hasInvalidEscrowCancelAfterExpiration()) {
               errors.push(this.getCancelAfterErrorMessage());
          }

          return errors;
     });
}
