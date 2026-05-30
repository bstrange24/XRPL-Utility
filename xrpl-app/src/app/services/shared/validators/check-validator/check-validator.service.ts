import { computed, inject, Injectable } from '@angular/core';
import { ChecksStoreService } from '../../../checks/checks-store/checks-store.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';
import { AmountValidatorService } from '../amount-validator/amount-validator.service';
import { AppConstants } from '../../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class CheckValidatorService {
     public readonly checksStoreService = inject(ChecksStoreService);
     private readonly realTimeService = inject(RealTimeExpirationService);
     private readonly amountValidatorService = inject(AmountValidatorService);

     // Amount Error (only shows when user has entered something)
     getAmountErrorMessage = computed(() => {
          const amount = this.checksStoreService.amount()?.trim() ?? '';

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

     hasInvalidCheckExpiration = computed(() => {
          const expiration = this.checksStoreService.checkExpirationDate();
          const isEnabled = this.checksStoreService.enableExpirationDate();

          if (!isEnabled || !expiration) return false;
          return this.realTimeService.isCheckExpired();
     });

     getCheckExpirationErrorMessage = computed(() => {
          if (!this.hasInvalidCheckExpiration()) return '';
          return 'Check has expired or expiration date is invalid.';
     });

     // Overall validation errors (used by <app-validation-errors>)
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const amountErr = this.getAmountErrorMessage();
          if (amountErr) errors.push(amountErr);

          const expErr = this.getCheckExpirationErrorMessage();
          if (expErr) errors.push(expErr);

          return errors;
     });
}
