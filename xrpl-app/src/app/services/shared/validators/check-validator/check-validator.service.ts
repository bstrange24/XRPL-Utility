import { computed, inject, Injectable } from '@angular/core';
import { ChecksStoreService } from '../../../checks/checks-store/checks-store.service';
import { RealTimeExpirationService } from '../../real-time-date-expiration-check/real-time-expiration.service';

@Injectable({
     providedIn: 'root',
})
export class CheckValidatorService {
     public readonly checksStoreService = inject(ChecksStoreService);
     private readonly realTimeService = inject(RealTimeExpirationService);

     hasInvalidCheckExpiration = computed(() => {
          const expiration = this.checksStoreService.checkExpirationDate();
          const isEnabled = this.checksStoreService.enableExpirationDate();

          if (!isEnabled || !expiration) return false;

          // Use real-time service to check if expired
          return this.realTimeService.isCheckExpired();
     });

     getCheckExpirationErrorMessage = computed(() => {
          if (!this.hasInvalidCheckExpiration()) return '';

          const expiration = this.checksStoreService.checkExpirationDate();
          if (!expiration) return '';

          const timeRemaining = this.realTimeService.checkTimeRemaining();
          if (timeRemaining === 'Expired') {
               return `Check has expired (${new Date(expiration).toLocaleString()}). Please select a future date/time.`;
          }

          return `Check expiration is invalid. ${timeRemaining}`;
     });

     isCheckExpirationValid = computed(() => {
          const expiration = this.checksStoreService.checkExpirationDate();
          const isEnabled = this.checksStoreService.enableExpirationDate();

          if (!isEnabled || !expiration) return true;

          return !this.hasInvalidCheckExpiration();
     });
}
