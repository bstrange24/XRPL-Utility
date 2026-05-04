import { TestBed } from '@angular/core/testing';
import { TransactionUiService, TxStep } from './transaction-ui.service';
import { DomSanitizer } from '@angular/platform-browser';
import { XrplService } from '../xrpl-services/xrpl.service';
import { AccountDeleteStoreService } from '../account-delete/account-delete-store/account-delete-store.service';
import { signal } from '@angular/core';

describe('TransactionUiService', () => {
     let service: TransactionUiService;

     let sanitizerMock: jasmine.SpyObj<DomSanitizer>;
     let xrplServiceMock: any;
     let deleteStoreMock: any;

     beforeEach(() => {
          sanitizerMock = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);

          sanitizerMock.bypassSecurityTrustHtml.and.callFake((v: any) => v);

          xrplServiceMock = {
               getNet: jasmine.createSpy().and.returnValue({
                    environment: 'devnet',
               }),
          };

          deleteStoreMock = {
               savedTxJson: signal([]),
               savedTxResult: signal([]),
          };

          TestBed.configureTestingModule({
               providers: [TransactionUiService, { provide: DomSanitizer, useValue: sanitizerMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: AccountDeleteStoreService, useValue: deleteStoreMock }],
          });

          service = TestBed.inject(TransactionUiService);
     });

     it('should initialize default state', () => {
          expect(service.currentStep()).toBe('idle');
          expect(service.isError()).toBeFalse();
          expect(service.isSuccess()).toBeFalse();
     });

     it('should set tx signal correctly', () => {
          service.setTxSignal({ a: 1 });
          expect(service.txSignal().length).toBe(1);
     });

     it('should append tx result signal', () => {
          service.addTxResultSignal({ x: 1 });
          expect(service.txResultSignal().length).toBe(1);
     });

     it('should append tx hash signal', () => {
          service.addTxHashSignal('abc');
          expect(service.txHashSignal().length).toBe(1);
     });

     it('should clear all signals', () => {
          service.setTxSignal({ a: 1 });
          service.setTxResultSignal({ b: 1 });
          // service.setTxHashSignal('h1');

          service.clearTxResultsHash();

          expect(service.txSignal().length).toBe(0);
          expect(service.txResultSignal().length).toBe(0);
          expect(service.txHashSignal().length).toBe(0);
     });

     it('should toggle options', () => {
          service.toggleOptions(true);
          expect(service.wantsOptions()).toBeTrue();

          service.toggleOptions(false);
          expect(service.wantsOptions()).toBeFalse();
     });

     it('should set success state', () => {
          service.setSuccess('ok', 'hash123');

          expect(service.isSuccess()).toBeTrue();
          expect(service.isError()).toBeFalse();
          expect(service.txHash).toBe('hash123');
     });

     it('should set error state', () => {
          service.setError('fail', 'hash999');

          expect(service.isError()).toBeTrue();
          expect(service.isSuccess()).toBeFalse();
          expect(service.txHash).toBe('hash999');
     });

     it('should compute explorer url', () => {
          const url = service.explorerUrl();
          expect(url).toContain('devnet');
     });

     it('should clear warning', () => {
          service.setWarning('warn');
          service.clearWarning();

          expect(service.warningMessage).toBeNull();
     });

     it('should update step message', () => {
          service.currentStep.set('signing');
          expect(service.stepMessage()).toContain('Signing');
     });

     it('should return correct messages for all steps', () => {
          const cases: TxStep[] = ['preparing', 'signing', 'submitting', 'waiting_validation', 'waiting_for_wallet_creation', 'finalizing', 'success', 'failed', 'idle'];

          cases.forEach(step => {
               service.currentStep.set(step);
               const msg = service.stepMessage();

               if (step === 'idle') {
                    expect(msg).toBe('');
               } else {
                    expect(msg.length).toBeGreaterThan(0);
               }
          });
     });

     it('should reset step to idle', () => {
          service.currentStep.set('failed');
          service.resetCurrentStepToIdle();

          expect(service.currentStep()).toBe('idle');
     });

     it('should normalize tx result signal to array', () => {
          service.setTxResultSignal({ a: 1 });
          expect(service.txResultSignal().length).toBe(1);

          service.setTxResultSignal([{ b: 2 }]);
          expect(service.txResultSignal().length).toBe(1);
     });

     it('should append tx signal', () => {
          service.addTxSignal({ a: 1 });
          expect(service.txSignal().length).toBe(1);
     });

     it('should clear messages and reset state', () => {
          service.setSuccess('ok', 'hash');
          service.clearMessages();

          expect(service.result()).toBe('');
          expect(service.isSuccess()).toBeFalse();
          expect(service.isError()).toBeFalse();
          expect(service.txHash).toBe('');
     });

     it('should reset state when toggling simulate', () => {
          service.setSuccess('ok', 'hash');

          service.toggleSimulate();

          expect(service.txHash).toBe('');
          expect(service.txSignal().length).toBe(0);
          expect(service.txResultSignal().length).toBe(0);
     });

     it('should sanitize and set info message', () => {
          service.setInfoMessage('<b>test</b>');
          expect(service.infoMessage).toBe('<b>test</b>');
          expect(service.safeInfo).toBeDefined();
          expect(sanitizerMock.bypassSecurityTrustHtml).toHaveBeenCalled();
     });

     it('should clear info message', () => {
          service.setInfoMessage(null);
          expect(service.infoMessage).toBeNull();
     });

     it('should set warning message', () => {
          service.setWarning('<b>warn</b>');
          expect(service.warningMessage).toBe('<b>warn</b>');
          expect(service.safeWarning).toBeDefined();
     });

     it('should handle transaction result', () => {
          service.handleTransactionResult({
               result: 'test',
               isError: true,
               isSuccess: false,
          });

          expect(service.result()).toBe('test');
          expect(service.isError()).toBeTrue();
          expect(service.isSuccess()).toBeFalse();
     });

     it('should clear all fields', () => {
          service.wantsOptions.set(true);
          service.clearAllFields();

          expect(service.wantsOptions()).toBeFalse();
     });

     it('should clear tx results when not suppressed and no saved data', () => {
          spyOn(service, 'clearTxResultsHash');

          service.clearAllOptionsAndMessages();

          expect(service.clearTxResultsHash).toHaveBeenCalled();
     });

     it('should NOT clear tx results when suppressed', () => {
          spyOn(service, 'clearTxResultsHash');

          service.suppressTxClear.set(true);
          service.clearAllOptionsAndMessages();

          expect(service.clearTxResultsHash).not.toHaveBeenCalled();
     });

     it('should NOT clear when delete store has data', () => {
          spyOn(service, 'clearTxResultsHash');

          deleteStoreMock.savedTxJson.set([1]);

          service.clearAllOptionsAndMessages();

          expect(service.clearTxResultsHash).not.toHaveBeenCalled();
     });

     it('should fallback to DEVNET if env not found', () => {
          xrplServiceMock.getNet.and.returnValue({ environment: 'unknown' });

          const url = service.explorerUrl();
          expect(url).toBeDefined();
     });

     it('should push into txResult array', () => {
          service.setTxResult({ a: 1 });
          expect(service.txResult.length).toBe(1);
     });

     it('should set success properties directly', () => {
          service.setSuccessProperties();
          expect(service.isSuccess()).toBeTrue();
          expect(service.isError()).toBeFalse();
     });

     it('should set multi success properties', () => {
          service.setSuccessMultiTransactionsProperties();
          expect(service.isSuccess()).toBeTrue();
     });
});
