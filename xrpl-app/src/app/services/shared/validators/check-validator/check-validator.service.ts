import { computed, inject, Injectable } from '@angular/core';
import { ChecksStoreService } from '../../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../../checks/checks-util/check-util.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';
import { ExpirationValidatorService } from '../expiration-validator/expiration-validator.service';

@Injectable({
  providedIn: 'root',
})
export class CheckValidatorService {
  public readonly checksStoreService = inject(ChecksStoreService);
     public readonly CheckUtilService = inject(CheckUtilService);
     private readonly expirationValidator = inject(ExpirationValidatorService);
     private readonly realTimeService = inject(RealTimeExpirationService);

     isCheckExpirationValid = computed(() => {
          const expiration = this.checksStoreService.checkExpirationDate();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidCheckExpiration = computed(() => {
          const expiration = this.checksStoreService.checkExpirationDate();
          const isEnabled = this.checksStoreService.enableExpirationDate();

          if (!isEnabled || !expiration) return false;

          // Use real-time service to check if expired
          return this.realTimeService.isCredentialExpired();
     });

     getCheckExpirationErrorMessage = computed(() => {
          if (!this.hasInvalidCheckExpiration()) return '';

          const expiration = this.checksStoreService.checkExpirationDate();
          if (!expiration) return '';

          const timeRemaining = this.realTimeService.credentialTimeRemaining();
          if (timeRemaining === 'Expired') {
               return `Credential has expired (${new Date(expiration).toLocaleString()}). Please select a future date/time.`;
          }

          return `Credential expiration is invalid. ${timeRemaining}`;
     });
}
