import { computed, inject, Injectable } from '@angular/core';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';
import { CredentialUtilService } from '../../../credentials/credential-util/credential-util.service';
import { PaymentChannelStoreService } from '../../../payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../transaction-ui/transaction-ui.service';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelValidatorService {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     private readonly expirationValidator = inject(ExpirationValidatorService);
     private readonly txUiService = inject(TransactionUiService);

     isPaymentChannelExpirationValid = computed(() => {
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidPaymentChannelExpiration = computed(() => {
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          if (!expiration) return false;
          return !this.isPaymentChannelExpirationValid();
     });

     hasInvalidPaymentChannelExpirationWhenEnabled = computed(() => {
          if (!this.txUiService.wantsOptions()) return false; // Main toggle off → no error

          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          if (!expiration) return false;

          return !this.expirationValidator.isValid(expiration);
     });

     getPaymentChannelExpirationErrorMessage = computed(() => {
          const expiration = this.paymentChannelStoreService.paymentChannelCancelAfterTimeField();
          return this.expirationValidator.getErrorMessage(expiration);
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
