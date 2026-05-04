import { TestBed } from '@angular/core/testing';
import { CopyUtilService } from './copy-util.service';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

// ---- Mocks ----

class MockToastService {
     successCalls: string[] = [];
     errorCalls: string[] = [];

     success(msg: string): void {
          this.successCalls.push(msg);
     }

     error(msg: string): void {
          this.errorCalls.push(msg);
     }
}

class MockTransactionUiService {
     txSignal(): unknown {
          return { foo: 'bar' };
     }

     txResultSignal(): unknown {
          return { result: 'ok' };
     }

     txResult = { direct: true };
}

// ---- Clipboard Mock (strict-safe) ----

class MockClipboard {
     shouldFail = false;
     lastText = '';

     writeText(text: string): Promise<void> {
          this.lastText = text;
          return this.shouldFail ? Promise.reject() : Promise.resolve();
     }
}

describe('CopyUtilService (strict, no adapter)', () => {
     let service: CopyUtilService;
     let toast: MockToastService;
     let clipboard: MockClipboard;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [CopyUtilService, { provide: ToastService, useClass: MockToastService }, { provide: TransactionUiService, useClass: MockTransactionUiService }],
          });

          service = TestBed.inject(CopyUtilService);
          toast = TestBed.inject(ToastService) as unknown as MockToastService;

          clipboard = new MockClipboard();

          // 🔑 Override navigator.clipboard safely
          Object.defineProperty(navigator, 'clipboard', {
               value: clipboard,
               configurable: true,
          });
     });

     it('copies string and shows success toast', async () => {
          await service.copyAndToast('hello', 'Test');

          expect(clipboard.lastText).toBe('hello');
          expect(toast.successCalls).toContain('Test copied');
     });

     it('stringifies object before copying', async () => {
          await service.copyAndToast({ a: 1 }, 'Obj');

          expect(clipboard.lastText).toContain('"a": 1');
          expect(toast.successCalls).toContain('Obj copied');
     });

     // it('shows error toast on failure', async () => {
     //      clipboard.shouldFail = true;

     //      await service.copyAndToast('fail', 'Test');

     //      expect(toast.errorCalls).toContain('Failed to copy Test');
     // });

     it('copyAddress delegates correctly', async () => {
          await service.copyAddress('r123');
          expect(clipboard.lastText).toBe('r123');
     });

     it('copySeed delegates correctly', async () => {
          await service.copySeed('seed123');
          expect(clipboard.lastText).toBe('seed123');
     });

     it('copyTxSignal uses txSignal()', async () => {
          await service.copyTxSignal();
          expect(clipboard.lastText).toContain('"foo": "bar"');
     });

     it('copySignTx passes JSON through', async () => {
          await service.copySignTx({ x: 1 });
          expect(clipboard.lastText).toContain('"x": 1');
     });

     it('copyTxResultSignal uses txResultSignal()', async () => {
          await service.copyTxResultSignal();
          expect(clipboard.lastText).toContain('"result": "ok"');
     });

     it('copyTxResult uses direct property', async () => {
          await service.copyTxResult();
          expect(clipboard.lastText).toContain('"direct": true');
     });

     it('copySignedTx copies text', async () => {
          await service.copySignedTx('signed');
          expect(clipboard.lastText).toBe('signed');
     });

     it('copyTxHash copies text', async () => {
          await service.copyTxHash('hash');
          expect(clipboard.lastText).toBe('hash');
     });
});
