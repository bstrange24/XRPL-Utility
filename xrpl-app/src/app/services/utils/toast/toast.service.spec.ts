import { TestBed } from '@angular/core/testing';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService, Toast } from './toast.service';
import { AppConstants } from '../../../core/app.constants';

describe('ToastService', () => {
     let service: ToastService;
     let sanitizerMock: jasmine.SpyObj<DomSanitizer>;

     beforeEach(() => {
          sanitizerMock = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
          sanitizerMock.bypassSecurityTrustHtml.and.callFake((html: string) => html as SafeHtml);

          TestBed.configureTestingModule({
               providers: [ToastService, { provide: DomSanitizer, useValue: sanitizerMock }],
          });

          service = TestBed.inject(ToastService);
     });

     afterEach(() => {
          service.clear();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have empty toasts array', () => {
               expect(service.toasts().length).toBe(0);
          });
     });

     describe('success', () => {
          it('should add a success toast', () => {
               service.success('Operation completed');
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);
               expect(toasts[0].type).toBe('success');
               expect(toasts[0].message).toBe('Operation completed');
          });

          it('should create toast with hash link', () => {
               service.success('Transaction submitted', 4000, true, 'txHash123', 'https://testnet.xrpl.org/tx/');
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('successMultipleHashesWithTickets', () => {
          it('should create toast with multiple ticket links', () => {
               const results = [
                    { ticketSeq: '1', hash: 'hash1' },
                    { ticketSeq: '2', hash: 'hash2' },
               ];
               service.successMultipleHashesWithTickets('Tickets created', results);
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('successMultipleHashesWithDepositAuth', () => {
          it('should create toast with multiple deposit auth links', () => {
               const results = [
                    { depostiAuthAddress: 'rAddr1', hash: 'hash1' },
                    { depostiAuthAddress: 'rAddr2', hash: 'hash2' },
               ];
               service.successMultipleHashesWithDepositAuth('Deposit auth set', results);
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('successMultipleHashes', () => {
          it('should create toast with multiple hash links', () => {
               const results = [
                    { hash: 'hash1', label: 'Flag 1' },
                    { hash: 'hash2', label: 'Flag 2' },
               ];
               service.successMultipleHashes('Flags updated', 4000, results);
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('errorMultipleHashes', () => {
          it('should create error toast with multiple hash links', () => {
               const results = [
                    { hash: 'hash1', label: 'Flag 1', error: 'Failed' },
                    { hash: 'hash2', label: 'Flag 2', error: 'Timeout' },
               ];
               service.errorMultipleHashes('Flags failed', 4000, results);
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('buildMultiErrorMessage', () => {
          it('should build multi error message', () => {
               const failedResults = [
                    { address: 'rAddr1', hash: 'hash1', error: 'Insufficient balance' },
                    { address: 'rAddr2', error: 'Network error' },
               ];
               service.buildMultiErrorMessage(failedResults, 'transactions');
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('error', () => {
          it('should add an error toast', () => {
               service.error('Operation failed');
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);
               expect(toasts[0].type).toBe('error');
               expect(toasts[0].message).toBe('Operation failed');
          });

          it('should create error toast with hash link', () => {
               service.error('Transaction failed', 4000, true, 'txHash123');
               expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
          });
     });

     describe('info', () => {
          it('should add an info toast', () => {
               service.info('Information message');
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);
               expect(toasts[0].type).toBe('info');
               expect(toasts[0].message).toBe('Information message');
          });
     });

     describe('warn', () => {
          it('should add a warn toast', () => {
               service.warn('Warning message');
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);
               expect(toasts[0].type).toBe('warn');
               expect(toasts[0].message).toBe('Warning message');
          });
     });

     describe('show', () => {
          it('should add a custom toast', () => {
               service.show({ message: 'Custom toast', type: 'success', duration: 3000 });
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);
               expect(toasts[0].message).toBe('Custom toast');
               expect(toasts[0].type).toBe('success');
               expect(toasts[0].duration).toBe(3000);
          });
     });

     describe('startTimer', () => {
          it('should start timer and interval', done => {
               service.show({ message: 'Test', type: 'success', duration: 100 });
               const toasts = service.toasts();
               expect(toasts.length).toBe(1);

               setTimeout(() => {
                    expect(service.toasts().length).toBe(0);
                    done();
               }, 150);
          });
     });

     describe('pauseTimer', () => {
          it('should pause timer and interval', () => {
               service.show({ message: 'Test', type: 'success', duration: 1000 });
               const id = service.toasts()[0].id;

               service.pauseTimer(id);
               expect(service['pausedToasts'].has(id)).toBeTrue();
          });
     });

     describe('resumeTimer', () => {
          it('should resume timer after pause', () => {
               service.show({ message: 'Test', type: 'success', duration: 1000 });
               const id = service.toasts()[0].id;

               service.pauseTimer(id);
               service.resumeTimer(id);
               expect(service['pausedToasts'].has(id)).toBeFalse();
          });
     });

     describe('removeToast', () => {
          it('should remove toast and clear timers', () => {
               service.show({ message: 'Test', type: 'success', duration: 1000 });
               const id = service.toasts()[0].id;

               service.removeToast(id);
               expect(service.toasts().length).toBe(0);
               expect(service['timers'].has(id)).toBeFalse();
               expect(service['intervals'].has(id)).toBeFalse();
          });
     });

     describe('clear', () => {
          it('should clear all toasts and timers', () => {
               service.show({ message: 'Toast 1', type: 'success', duration: 1000 });
               service.show({ message: 'Toast 2', type: 'error', duration: 1000 });

               expect(service.toasts().length).toBe(2);

               service.clear();
               expect(service.toasts().length).toBe(0);
               expect(service['timers'].size).toBe(0);
               expect(service['intervals'].size).toBe(0);
               expect(service['pausedToasts'].size).toBe(0);
          });
     });

     describe('Edge Cases', () => {
          it('should handle multiple toasts', () => {
               service.success('Toast 1');
               service.error('Toast 2');
               service.info('Toast 3');

               expect(service.toasts().length).toBe(3);
          });

          it('should handle pause on non-existent toast', () => {
               expect(() => service.pauseTimer(99999)).not.toThrow();
          });

          it('should handle resume on non-existent paused toast', () => {
               expect(() => service.resumeTimer(99999)).not.toThrow();
          });

          it('should handle remove on non-existent toast', () => {
               expect(() => service.removeToast(99999)).not.toThrow();
          });
     });
});
