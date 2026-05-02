import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TransactionPreviewComponent } from './transaction-preview.component';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../services/utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../../services/utils/download-util/download-util.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

/* ---------------- MOCK SERVICES ---------------- */

class MockTransactionUiService {
     currentStep = signal<'idle' | 'preparing' | 'waiting_validation' | 'success' | 'failed'>('idle');
     isSignedTx = signal(false);

     txSignal = signal<any[]>([]);
     txResultSignal = signal<any[]>([]);

     stepMessage = signal('Preparing transaction...');
     detailedStatus = signal('');
}

class MockCopyUtilService {
     copyTxSignal = jasmine.createSpy('copyTxSignal');
     copyTxResultSignal = jasmine.createSpy('copyTxResultSignal');
}

class MockDownloadUtilService {
     downloadTxSignal = jasmine.createSpy('downloadTxSignal');
     downloadTxResultSignal = jasmine.createSpy('downloadTxResultSignal');
}

/* ---------------- TEST SETUP ---------------- */

describe('TransactionPreviewComponent', () => {
     let fixture: ComponentFixture<TransactionPreviewComponent>;
     let component: TransactionPreviewComponent;

     let txUi: MockTransactionUiService;
     let copyUtil: MockCopyUtilService;
     let downloadUtil: MockDownloadUtilService;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TransactionPreviewComponent],
               providers: [
                    provideNoopAnimations(),

                    { provide: TransactionUiService, useClass: MockTransactionUiService },
                    { provide: CopyUtilService, useClass: MockCopyUtilService },
                    { provide: DownloadUtilService, useClass: MockDownloadUtilService },

                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TransactionPreviewComponent);
          component = fixture.componentInstance;

          txUi = TestBed.inject(TransactionUiService) as unknown as MockTransactionUiService;
          copyUtil = TestBed.inject(CopyUtilService) as unknown as MockCopyUtilService;
          downloadUtil = TestBed.inject(DownloadUtilService) as unknown as MockDownloadUtilService;
     });

     function flushMicrotasks() {
          return fixture.whenStable();
     }

     /* ---------------- BASIC ---------------- */

     it('should create', () => {
          fixture.detectChanges();
          expect(component).toBeTruthy();
     });

     /* ---------------- SPINNER ---------------- */

     describe('spinner rendering', () => {
          it('should show spinner when in progress and not signed', () => {
               txUi.currentStep.set('preparing');
               txUi.isSignedTx.set(false);

               fixture.detectChanges();

               const spinner = fixture.debugElement.query(By.css('.animate-spin'));
               expect(spinner).not.toBeNull();
          });

          it('should NOT show spinner when step is success', () => {
               txUi.currentStep.set('success');

               fixture.detectChanges();

               const spinner = fixture.debugElement.query(By.css('.animate-spin'));
               expect(spinner).toBeNull();
          });

          it('should NOT show spinner when signed tx is true', () => {
               txUi.currentStep.set('preparing');
               txUi.isSignedTx.set(true);

               fixture.detectChanges();

               const spinner = fixture.debugElement.query(By.css('.animate-spin'));
               expect(spinner).toBeNull();
          });
     });

     /* ---------------- TX JSON ---------------- */

     describe('transaction JSON preview', () => {
          it('should render tx JSON block when txSignal has data', async () => {
               txUi.txSignal.set([{ Amount: '100' }]);

               fixture.detectChanges();
               await flushMicrotasks();

               const header = fixture.nativeElement.textContent;
               expect(header).toContain('Transaction JSON');
          });

          it('should NOT render tx JSON block when empty', () => {
               txUi.txSignal.set([]);

               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).not.toContain('Transaction JSON');
          });

          it('should populate JSON content into <code> element', async () => {
               const tx = [{ foo: 'bar' }];
               txUi.txSignal.set(tx);

               fixture.detectChanges();
               await flushMicrotasks();

               const codeEl = component.paymentJson?.nativeElement;
               expect(codeEl.textContent).toContain('"foo": "bar"');
          });
     });

     /* ---------------- TX RESULT ---------------- */

     describe('transaction result preview', () => {
          it('should render result block when txResultSignal has data', async () => {
               txUi.txResultSignal.set([{ result: 'tesSUCCESS' }]);

               fixture.detectChanges();
               await flushMicrotasks();

               expect(fixture.nativeElement.textContent).toContain('Transaction Result');
          });

          it('should populate result JSON', async () => {
               const result = [{ status: 'ok' }];
               txUi.txResultSignal.set(result);

               fixture.detectChanges();
               await flushMicrotasks();

               const codeEl = component.txResultJson?.nativeElement;
               expect(codeEl.textContent).toContain('"status": "ok"');
          });
     });

     /* ---------------- BUTTON ACTIONS ---------------- */

     describe('button interactions', () => {
          beforeEach(async () => {
               txUi.txSignal.set([{ foo: 'bar' }]);
               txUi.txResultSignal.set([{ result: true }]);

               fixture.detectChanges();
               await flushMicrotasks();
          });

          it('should call copyTxSignal when copy button clicked', () => {
               const buttons = fixture.debugElement.queryAll(By.css('button'));

               const copyBtn = buttons.find(btn => btn.nativeElement.textContent.includes('Copy'));

               copyBtn?.triggerEventHandler('click');

               expect(copyUtil.copyTxSignal).toHaveBeenCalled();
          });

          it('should call downloadTxSignal when download button clicked', () => {
               const buttons = fixture.debugElement.queryAll(By.css('button'));

               const downloadBtn = buttons.find(btn => btn.nativeElement.textContent.includes('Download'));

               downloadBtn?.triggerEventHandler('click');

               expect(downloadUtil.downloadTxSignal).toHaveBeenCalled();
          });

          it('should call copyTxResultSignal for result section', () => {
               const buttons = fixture.debugElement.queryAll(By.css('button'));

               const copyButtons = buttons.filter(btn => btn.nativeElement.textContent.includes('Copy'));

               // second copy button = result
               copyButtons[1].triggerEventHandler('click');

               expect(copyUtil.copyTxResultSignal).toHaveBeenCalled();
          });
     });

     /* ---------------- STATUS TEXT ---------------- */

     describe('status messages', () => {
          it('should render step message', () => {
               txUi.currentStep.set('preparing');
               txUi.stepMessage.set('Signing...');

               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Signing...');
          });

          it('should render detailed status if present', () => {
               txUi.currentStep.set('preparing');
               txUi.detailedStatus.set('Waiting for ledger');

               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Waiting for ledger');
          });
     });
});
