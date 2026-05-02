import { TestBed } from '@angular/core/testing';
import { XrplDateService } from './xrpl-date.service';
import { AppConstants } from './app.constants';

describe('XrplDateService', () => {
     let service: XrplDateService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(XrplDateService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('normalizeDateTimeLocal', () => {
          it('should return empty string for falsy value', () => {
               expect(service.normalizeDateTimeLocal('')).toBe('');
               expect(service.normalizeDateTimeLocal(null as any)).toBe('');
               expect(service.normalizeDateTimeLocal(undefined as any)).toBe('');
          });

          it('should add seconds when length is 16 (YYYY-MM-DDTHH:MM)', () => {
               const result = service.normalizeDateTimeLocal('2024-01-15T14:30');
               expect(result).toBe('2024-01-15T14:30:00');
          });

          it('should return unchanged when seconds already present', () => {
               const result = service.normalizeDateTimeLocal('2024-01-15T14:30:45');
               expect(result).toBe('2024-01-15T14:30:45');
          });

          it('should return unchanged for other lengths', () => {
               const result = service.normalizeDateTimeLocal('2024-01-15T14');
               expect(result).toBe('2024-01-15T14');
          });
     });

     describe('toRippleTime', () => {
          const rippleEpoch = AppConstants.RIPPLE_EPOCH; // Jan 1, 2000

          it('should return undefined for empty value', () => {
               expect(service.toRippleTime('')).toBeUndefined();
               expect(service.toRippleTime(null as any)).toBeUndefined();
          });

          it('should convert datetime-local to ripple seconds', () => {
               // Jan 1, 2000 00:00:00 UTC should be 0
               const date = new Date(rippleEpoch);
               const dateStr = service.formatDateTimeLocal(date);
               const result = service.toRippleTime(dateStr);
               expect(result).toBe(0);
          });

          it('should convert a date to correct ripple seconds', () => {
               // Jan 2, 2000 00:00:00 UTC = 86400 seconds
               const date = new Date(rippleEpoch + 86400 * 1000);
               const dateStr = service.formatDateTimeLocal(date);
               const result = service.toRippleTime(dateStr);
               expect(result).toBe(86400);
          });

          it('should normalize datetime-local before conversion', () => {
               const dateStr = '2024-01-15T14:30'; // Missing seconds
               const result = service.toRippleTime(dateStr);
               expect(result).toBeDefined();
               expect(typeof result).toBe('number');
          });

          it('should throw error for invalid datetime value', () => {
               expect(() => service.toRippleTime('invalid-date')).toThrowError('Invalid datetime value');
          });
     });

     describe('fromRippleTime', () => {
          it('should convert ripple seconds to JS Date', () => {
               const rippleSeconds = 86400; // 1 day after ripple epoch
               const result = service.fromRippleTime(rippleSeconds);
               const expected = new Date(AppConstants.RIPPLE_EPOCH + 86400 * 1000);
               expect(result.getTime()).toBe(expected.getTime());
          });

          it('should handle zero ripple seconds', () => {
               const result = service.fromRippleTime(0);
               expect(result.getTime()).toBe(AppConstants.RIPPLE_EPOCH);
          });

          it('should handle negative ripple seconds (before epoch)', () => {
               const result = service.fromRippleTime(-86400);
               const expected = new Date(AppConstants.RIPPLE_EPOCH - 86400 * 1000);
               expect(result.getTime()).toBe(expected.getTime());
          });
     });

     describe('rippleToISO', () => {
          it('should convert ripple seconds to ISO string', () => {
               const rippleSeconds = 86400;
               const result = service.rippleToISO(rippleSeconds);
               const expected = new Date(AppConstants.RIPPLE_EPOCH + 86400 * 1000).toISOString();
               expect(result).toBe(expected);
          });

          it('should handle zero ripple seconds', () => {
               const result = service.rippleToISO(0);
               const expected = new Date(AppConstants.RIPPLE_EPOCH).toISOString();
               expect(result).toBe(expected);
          });
     });

     describe('rippleToEst', () => {
          it('should convert ripple seconds to EST formatted string', () => {
               // Use a fixed timestamp to avoid timezone test issues
               const rippleSeconds = 0; // Jan 1, 2000 00:00:00 UTC
               const result = service.rippleToEst(rippleSeconds);
               // Should return a formatted EST string
               expect(result).toContain('/');
               expect(result).toContain(':');
          });

          it('should handle positive ripple seconds', () => {
               const rippleSeconds = 86400; // 1 day
               const result = service.rippleToEst(rippleSeconds);
               expect(typeof result).toBe('string');
               expect(result.length).toBeGreaterThan(0);
          });
     });

     describe('formatDateTimeLocal', () => {
          it('should format Date to datetime-local string', () => {
               const date = new Date(2024, 0, 15, 14, 30, 45); // Jan 15, 2024 14:30:45
               const result = service.formatDateTimeLocal(date);
               expect(result).toBe('2024-01-15T14:30:45');
          });

          it('should pad single-digit values', () => {
               const date = new Date(2024, 0, 5, 4, 5, 7); // Jan 5, 2024 04:05:07
               const result = service.formatDateTimeLocal(date);
               expect(result).toBe('2024-01-05T04:05:07');
          });

          it('should handle midnight', () => {
               const date = new Date(2024, 0, 1, 0, 0, 0);
               const result = service.formatDateTimeLocal(date);
               expect(result).toBe('2024-01-01T00:00:00');
          });
     });

     describe('isExpired', () => {
          let nowSpy: jasmine.Spy;

          beforeEach(() => {
               // Mock current time to Jan 1, 2024 12:00:00
               const mockNow = new Date(2024, 0, 1, 12, 0, 0).getTime();
               const rippleEpoch = AppConstants.RIPPLE_EPOCH;
               const mockNowRipple = Math.floor((mockNow - rippleEpoch) / 1000);
               nowSpy = spyOn(Date, 'now').and.returnValue(mockNow);
          });

          afterEach(() => {
               nowSpy.and.callThrough();
          });

          it('should return false when rippleSeconds is undefined', () => {
               expect(service.isExpired(undefined)).toBeFalse();
               expect(service.isExpired(null as any)).toBeFalse();
               expect(service.isExpired(0)).toBeFalse();
          });

          it('should return true when expiration is in the past', () => {
               // Date.now mock is Jan 1, 2024 12:00:00
               // Jan 1, 2024 10:00:00 is in the past
               const pastDate = new Date(2024, 0, 1, 10, 0, 0);
               const pastRipple = Math.floor((pastDate.getTime() - AppConstants.RIPPLE_EPOCH) / 1000);
               expect(service.isExpired(pastRipple)).toBeTrue();
          });

          it('should return false when expiration is in the future', () => {
               // Jan 1, 2024 14:00:00 is in the future
               const futureDate = new Date(2024, 0, 1, 14, 0, 0);
               const futureRipple = Math.floor((futureDate.getTime() - AppConstants.RIPPLE_EPOCH) / 1000);
               expect(service.isExpired(futureRipple)).toBeFalse();
          });

          it('should use provided ledgerRippleSeconds when given', () => {
               const expirationRipple = 1000;
               const ledgerRipple = 2000; // Later than expiration
               expect(service.isExpired(expirationRipple, ledgerRipple)).toBeTrue();

               const laterLedgerRipple = 500; // Earlier than expiration
               expect(service.isExpired(expirationRipple, laterLedgerRipple)).toBeFalse();
          });
     });

     describe('nowLocal', () => {
          it('should return current datetime-local string', () => {
               const mockDate = new Date(2024, 0, 15, 14, 30, 45);
               spyOn(service, 'toLocalDateTimeString').and.returnValue('2024-01-15T14:30:45');
               spyOn(Date, 'now').and.returnValue(mockDate.getTime());

               const result = service.nowLocal();
               expect(result).toBe('2024-01-15T14:30:45');
          });
     });

     describe('addSeconds', () => {
          it('should add seconds to provided value', () => {
               const value = '2024-01-15T14:30:00';
               const result = service.addSeconds(value, 65);
               expect(result).toBe('2024-01-15T14:31:05');
          });

          it('should add seconds to current time when no value provided', () => {
               const mockDate = new Date(2024, 0, 15, 14, 30, 0);
               spyOn(service, 'toLocalDateTimeString').and.returnValue('2024-01-15T14:31:05');
               spyOn(Date, 'now').and.returnValue(mockDate.getTime());

               const result = service.addSeconds('', 65);
               expect(result).toBe('2024-01-15T14:31:05');
          });

          it('should handle negative seconds', () => {
               const value = '2024-01-15T14:30:00';
               const result = service.addSeconds(value, -30);
               expect(result).toBe('2024-01-15T14:29:30');
          });

          it('should cross minute boundary correctly', () => {
               const value = '2024-01-15T14:59:30';
               const result = service.addSeconds(value, 40);
               expect(result).toBe('2024-01-15T15:00:10');
          });

          it('should cross day boundary correctly', () => {
               const value = '2024-01-31T23:59:30';
               const result = service.addSeconds(value, 40);
               expect(result).toBe('2024-02-01T00:00:10');
          });
     });

     describe('toLocalDateTimeString', () => {
          it('should format Date to datetime-local string', () => {
               const date = new Date(2024, 0, 15, 14, 30, 45);
               const result = service.toLocalDateTimeString(date);
               expect(result).toBe('2024-01-15T14:30:45');
          });

          it('should pad single-digit values', () => {
               const date = new Date(2024, 0, 5, 4, 5, 7);
               const result = service.toLocalDateTimeString(date);
               expect(result).toBe('2024-01-05T04:05:07');
          });

          it('should handle December correctly', () => {
               const date = new Date(2024, 11, 25, 12, 0, 0); // Dec 25
               const result = service.toLocalDateTimeString(date);
               expect(result).toBe('2024-12-25T12:00:00');
          });

          it('should handle leap year date', () => {
               const date = new Date(2024, 1, 29, 10, 30, 0); // Feb 29 (leap year)
               const result = service.toLocalDateTimeString(date);
               expect(result).toBe('2024-02-29T10:30:00');
          });
     });

     describe('Integration - round trip conversions', () => {
          it('should convert Date → datetime-local → ripple seconds → Date correctly', () => {
               const originalDate = new Date(2024, 0, 15, 14, 30, 45);
               const dateStr = service.formatDateTimeLocal(originalDate);
               const rippleSeconds = service.toRippleTime(dateStr);
               const convertedDate = service.fromRippleTime(rippleSeconds!);
               expect(convertedDate.getTime()).toBe(originalDate.getTime());
          });

          it('should convert ripple seconds → Date → datetime-local → ripple seconds correctly', () => {
               const originalRipple = 86400;
               const date = service.fromRippleTime(originalRipple);
               const dateStr = service.formatDateTimeLocal(date);
               const convertedRipple = service.toRippleTime(dateStr);
               expect(convertedRipple).toBe(originalRipple);
          });
     });
});
