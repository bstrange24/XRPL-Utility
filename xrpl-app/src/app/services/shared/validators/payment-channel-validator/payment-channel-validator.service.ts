import { computed, inject, Injectable } from '@angular/core';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';
import { CredentialUtilService } from '../../../credentials/credential-util/credential-util.service';
import { PaymentChannelStoreService } from '../../../payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../transaction-ui/transaction-ui.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';
import { XrplTxOptionsStore } from '../../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelValidatorService {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     private readonly expirationValidator = inject(ExpirationValidatorService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly realTimeService = inject(RealTimeExpirationService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     isPaymentChannelExpirationValid = computed(() => {
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidPaymentChannelExpiration = computed(() => {
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          const isEnabled = this.xrplTxOptionsStore.isExpirationEnabled();

          if (!isEnabled || !expiration) return false;

          // Use real-time expired check
          return this.realTimeService.isPaymentChannelExpired();
     });

     hasInvalidPaymentChannelExpirationWhenEnabled = computed(() => {
          if (!this.txUiService.wantsOptions()) return false; // Main toggle off → no error

          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          if (!expiration) return false;

          return !this.expirationValidator.isValid(expiration);
     });

     getPaymentChannelExpirationErrorMessage = computed(() => {
          if (!this.hasInvalidPaymentChannelExpiration()) return '';
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          if (!expiration) return '';

          const timeRemaining = this.realTimeService.paymentChannelTimeRemaining();
          if (timeRemaining === 'Expired') {
               return `Payment channel expiration has passed (${new Date(expiration).toLocaleString()}). Please select a future date/time.`;
          }
          return `Payment channel expiration is invalid. ${timeRemaining}`;
     });

     claimSignatureError = computed(() => {
          const signature = this.paymentChannelStoreService.channelClaimSignatureField()?.trim();

          // Empty field = no error yet
          if (!signature) {
               return null;
          }

          if (!/^[A-F0-9]+$/i.test(signature)) {
               return 'Claim Signature must contain only hexadecimal characters';
          }

          if (signature.length % 2 !== 0) {
               return 'Claim Signature must contain an even number of characters';
          }

          if (signature.length < 140 || signature.length > 144) {
               return 'Claim Signature must be between 140 and 144 characters';
          }

          if (!signature.startsWith('30')) {
               return 'Claim Signature must be a valid DER-encoded signature';
          }

          return null;
     });

     isValidClaimSignature = computed(() => {
          return this.claimSignatureError() === null;
     });

     hasClaimSignature = computed(() => {
          const signature = this.paymentChannelStoreService.channelClaimSignatureField();
          return !!signature?.trim();
     });

     // isValidClaimSignature = computed(() => {
     //      const signature = this.paymentChannelStoreService.channelClaimSignatureField()?.trim();

     //      // Empty field = no validation error yet
     //      if (!signature) {
     //           return true;
     //      }

     //      // Must be hex
     //      if (!/^[A-F0-9]+$/i.test(signature)) {
     //           return false;
     //      }

     //      // Must have an even number of hex characters
     //      if (signature.length % 2 !== 0) {
     //           return false;
     //      }

     //      // Typical DER-encoded XRPL signature length
     //      if (signature.length < 140 || signature.length > 144) {
     //           return false;
     //      }

     //      return true;
     // });

     isSettleDelayValid = computed(() => {
          const delay = this.paymentChannelStoreService.settleDelay();
          if (delay === null || delay === '' || delay === undefined) return false;

          const num = Number(delay);
          return Number.isInteger(num) && num >= 0 && num <= 4_294_967_295;
     });

     isSettleDelayInvalid = computed(() => {
          const delay = this.paymentChannelStoreService.settleDelay();

          // Only show error if user has entered something invalid
          if (delay === null || delay === '' || delay === undefined) {
               return false;
          }

          const num = Number(delay);
          return !Number.isInteger(num) || num < 0 || num > 4_294_967_295;
     });

     isSettleDelayTooLarge = computed(() => {
          const delay = this.paymentChannelStoreService.settleDelay();
          if (!delay) return false;
          return Number(delay) > 4_294_967_295;
     });
}
