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
          // if (!expiration) return false;

          // Use real-time expired check
          return this.realTimeService.isPaymentChannelExpired();
     });

     // hasInvalidPaymentChannelExpiration = computed(() => {
     //      const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
     //      if (!expiration) return false;
     //      return !this.isPaymentChannelExpirationValid();
     // });

     hasInvalidPaymentChannelExpirationWhenEnabled = computed(() => {
          if (!this.txUiService.wantsOptions()) return false; // Main toggle off → no error

          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          if (!expiration) return false;

          return !this.expirationValidator.isValid(expiration);
     });

     // getPaymentChannelExpirationErrorMessage = computed(() => {
     //      const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
     //      return this.expirationValidator.getErrorMessage(expiration);
     // });

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

     isValidClaimSignature = computed(() => {
          const signature = this.paymentChannelStoreService.channelClaimSignatureField();
          if (signature === null || signature === '' || signature === undefined) return false;
          return true;
     });

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
