import { Injectable } from '@angular/core';
import { AppConstants } from './app.constants';

@Injectable({
     providedIn: 'root',
})
export class XrplDateService {
     /*
      * Normalize datetime-local values
      * Ensures seconds are present (browser calendars often omit them)
      */
     normalizeDateTimeLocal(value: string): string {
          if (!value) return '';

          if (value.length === 16) {
               return value + ':00';
          }

          return value;
     }

     /*
      * Convert datetime-local → Ripple epoch seconds
      */
     toRippleTime(value: string): number | undefined {
          if (!value) return undefined;

          const normalized = this.normalizeDateTimeLocal(value);

          const date = new Date(normalized);

          if (Number.isNaN(date.getTime())) {
               throw new Error('Invalid datetime value');
          }

          return Math.floor((date.getTime() - AppConstants.RIPPLE_EPOCH) / 1000);
     }

     /*
      * Convert ripple epoch → JS Date
      */
     fromRippleTime(rippleSeconds: number): Date {
          return new Date(AppConstants.RIPPLE_EPOCH + rippleSeconds * 1000);
     }

     /*
      * Convert ripple epoch → ISO string
      */
     rippleToISO(rippleSeconds: number): string {
          return this.fromRippleTime(rippleSeconds).toISOString();
     }

     /*
      * Convert ripple epoch → EST formatted string
      */
     rippleToEst(rippleSeconds: number): string {
          const date = this.fromRippleTime(rippleSeconds);

          return new Intl.DateTimeFormat('en-US', {
               timeZone: 'America/New_York',
               year: 'numeric',
               month: '2-digit',
               day: '2-digit',
               hour: '2-digit',
               minute: '2-digit',
               second: '2-digit',
               hour12: true,
          }).format(date);
     }

     /*
      * Check if ripple expiration already passed
      */
     isExpired(rippleSeconds?: number, ledgerRippleSeconds?: number): boolean {
          if (!rippleSeconds) return false;
          // Use ledger time if provided, otherwise fallback to local
          const nowRipple = ledgerRippleSeconds ?? Math.floor((Date.now() - AppConstants.RIPPLE_EPOCH) / 1000);
          return nowRipple > rippleSeconds;
     }

     /*
      * Return datetime-local string for "now"
      */
     nowLocal(): string {
          return this.toLocalDateTimeString(new Date());
     }

     /*
      * Add time to datetime-local value
      */
     addSeconds(value: string, seconds: number): string {
          let date = value ? new Date(value) : new Date();

          date.setSeconds(date.getSeconds() + seconds);

          return this.toLocalDateTimeString(date);
     }

     /*
      * Format Date → datetime-local string
      */
     toLocalDateTimeString(date: Date): string {
          const pad = (n: number) => n.toString().padStart(2, '0');

          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
     }
}
