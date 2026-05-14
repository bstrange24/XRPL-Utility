import { Injectable, signal, computed, effect } from '@angular/core';
import { DestroyRef, inject } from '@angular/core';

@Injectable({
     providedIn: 'root',
})
export class ExpirationValidatorService {
     private readonly clock = signal(Date.now());
     private readonly destroyRef = inject(DestroyRef);

     constructor() {
          // Global clock - updates every second
          const interval = setInterval(() => {
               this.clock.set(Date.now());
          }, 1000);

          // Auto cleanup
          this.destroyRef.onDestroy(() => clearInterval(interval));
     }

     /**
      * Check if expiration date is valid (in the future)
      */
     isValid(expiration: string | number | null | undefined): boolean {
          if (!expiration) return true; // empty = valid (optional field)

          let timestamp: number;

          if (typeof expiration === 'string') {
               timestamp = Number(expiration);
               if (isNaN(timestamp)) {
                    const date = new Date(expiration);
                    timestamp = Math.floor(date.getTime() / 1000);
               }
          } else {
               timestamp = expiration;
          }

          if (!Number.isFinite(timestamp)) return false;

          const now = Math.floor(this.clock() / 1000);
          return timestamp > now;
     }

     /**
      * Get user-friendly error message
      */
     getErrorMessage(expiration: string | number | null | undefined): string {
          if (!expiration) return '';

          let timestamp: number = 0;

          if (typeof expiration === 'string') {
               timestamp = Number(expiration);
               if (isNaN(timestamp)) {
                    const date = new Date(expiration);
                    if (!isNaN(date.getTime())) {
                         timestamp = Math.floor(date.getTime() / 1000);
                    }
               }
          } else if (typeof expiration === 'number') {
               timestamp = expiration;
          }

          const now = Math.floor(this.clock() / 1000);
          const expDate = new Date(timestamp * 1000);

          if (timestamp <= now) {
               return `Expiration date must be in the future. ${expDate.toLocaleString([], {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
               })} is in the past.`;
          }

          return 'Please enter a valid future date';
     }
}
