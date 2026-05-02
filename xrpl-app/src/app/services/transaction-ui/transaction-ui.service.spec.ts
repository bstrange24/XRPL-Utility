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

     // it('should reset simulate state', () => {
     //      service.setTxSignal({ a: 1 });
     //      service.setTxResultSignal({ b: 1 });
     //      service.txHash = 'abc';

     //      service.toggleSimulate();

     //      expect(service.txHash).toBeNull();
     //      expect(service.txSignal().length).toBe(0);
     // });

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

     it('should reset step to idle', () => {
          service.currentStep.set('failed');
          service.resetCurrentStepToIdle();

          expect(service.currentStep()).toBe('idle');
     });
});
