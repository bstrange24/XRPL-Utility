import { TestBed } from '@angular/core/testing';
import { ConnectionGuardService } from './connection-guard.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

type ConnectionStatusType = {
     isConnected: boolean;
     status: string;
     message: string;
};

// ---- Mocks ----

class MockXrplService {
     private ready = true;

     isConnectionReady(): boolean {
          return this.ready;
     }

     getConnectionStatus(): ConnectionStatusType {
          return this.ready ? { isConnected: true, status: 'connected', message: 'ok' } : { isConnected: false, status: 'disconnected', message: 'down' };
     }

     setReady(value: boolean): void {
          this.ready = value;
     }
}

class MockToastService {
     errorCalls: { message: string; type: string; sticky: boolean }[] = [];

     error(message: string, type: string, sticky: boolean): void {
          this.errorCalls.push({ message, type, sticky });
     }
}

// ---- Tests ----

describe('ConnectionGuardService (strict)', () => {
     let service: ConnectionGuardService;
     let xrpl: MockXrplService;
     let toast: MockToastService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [ConnectionGuardService, { provide: XrplService, useClass: MockXrplService }, { provide: ToastService, useClass: MockToastService }],
          });

          service = TestBed.inject(ConnectionGuardService);
          xrpl = TestBed.inject(XrplService) as unknown as MockXrplService;
          toast = TestBed.inject(ToastService) as unknown as MockToastService;
     });

     // -----------------------------
     // creation
     // -----------------------------
     it('should create', () => {
          expect(service).toBeTruthy();
     });

     // -----------------------------
     // success path
     // -----------------------------
     it('executes operation successfully and tracks pending operations', async () => {
          let executed = false;

          const result = await service.checkConnectionAndExecute(async () => {
               executed = true;
               return 42;
          });

          expect(result).toBe(42);
          expect(executed).toBeTrue();
          expect(service.hasPendingOperations()).toBeFalse();
     });

     // -----------------------------
     // error path with default message
     // -----------------------------
     it('handles failure and shows toast with default message', async () => {
          const failingOp = async (): Promise<number> => {
               throw new Error('boom');
          };

          await expectAsync(service.checkConnectionAndExecute(failingOp)).toBeRejectedWithError('Cannot perform transaction: No active network connection');

          expect(toast.errorCalls.length).toBe(1);
          expect(toast.errorCalls[0].message).toContain('Cannot perform transaction');
          // expect(toast.errorCalls[0].type).toBe(AppConstants.TOAST.ERROR);
          expect(toast.errorCalls[0].sticky).toBeFalse();

          expect(service.hasPendingOperations()).toBeFalse();
     });

     // -----------------------------
     // error path with custom message
     // -----------------------------
     it('uses custom error message when provided', async () => {
          const failingOp = async (): Promise<void> => {
               throw new Error('fail');
          };

          await expectAsync(service.checkConnectionAndExecute(failingOp, 'Custom error')).toBeRejectedWithError('Custom error');

          expect(toast.errorCalls[0].message).toContain('Custom error');
     });

     // -----------------------------
     // pending operations counter correctness
     // -----------------------------
     it('increments and decrements pending operations correctly', async () => {
          let resolveFn!: (value: number) => void;

          const promise = service.checkConnectionAndExecute(
               () =>
                    new Promise<number>(resolve => {
                         resolveFn = resolve;
                    })
          );

          expect(service.hasPendingOperations()).toBeTrue();

          resolveFn(1); // ✅ now safe

          await promise;

          expect(service.hasPendingOperations()).toBeFalse();
     });

     // -----------------------------
     // ensures counter never goes negative
     // -----------------------------
     it('never allows pending operations to go negative', async () => {
          const failingOp = async (): Promise<void> => {
               throw new Error('fail');
          };

          await expectAsync(service.checkConnectionAndExecute(failingOp)).toBeRejected();

          expect(service.hasPendingOperations()).toBeFalse();
     });

     // -----------------------------
     // passthrough methods
     // -----------------------------
     it('isConnectionReady delegates to xrplService', () => {
          xrpl.setReady(true);
          expect(service.isConnectionReady()).toBeTrue();

          xrpl.setReady(false);
          expect(service.isConnectionReady()).toBeFalse();
     });

     it('getConnectionStatus delegates to xrplService', () => {
          xrpl.setReady(true);
          const connected = service.getConnectionStatus();

          expect(connected.isConnected).toBeTrue();
          expect(connected.status).toBe('connected');

          xrpl.setReady(false);
          const disconnected = service.getConnectionStatus();

          expect(disconnected.isConnected).toBeFalse();
          expect(disconnected.status).toBe('disconnected');
     });
});
