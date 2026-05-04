import { TestBed } from '@angular/core/testing';
import { XrplTransactionService } from './xrpl-transaction.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { ToastService } from '../utils/toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { MptStoreService } from '../mpt/mpt-store/mpt-store.service';
import { AppConstants } from '../../core/app.constants';
import { signal, WritableSignal } from '@angular/core';

// Mock MptStoreService as a plain object, not a type
class MockMptStoreService {
     mptIssuanceId = jasmine.createSpy().and.returnValue('mpt123');
}

describe('XrplTransactionService', () => {
     let service: XrplTransactionService;
     let utilsService: jasmine.SpyObj<UtilsService>;
     let toastService: jasmine.SpyObj<ToastService>;
     let txUiService: jasmine.SpyObj<TransactionUiService>;
     let mptStoreService: MockMptStoreService;
     let mockClient: any;
     let mockWallet: any;
     let mockCurrentStep: { set: jasmine.Spy };

     beforeEach(() => {
          // Create spies
          utilsService = jasmine.createSpyObj('UtilsService', ['getMultiSignAddress', 'getMultiSignSeeds', 'handleMultiSignTransaction', 'isTxSuccessful', 'getTransactionResultMessage', 'processErrorMessageFromLedger', 'encodeIfNeeded']);
          toastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          txUiService = jasmine.createSpyObj('TransactionUiService', ['explorerUrl']);
          mptStoreService = new MockMptStoreService();

          // Create a mock currentStep that mimics a WritableSignal
          mockCurrentStep = { set: jasmine.createSpy() };
          Object.defineProperty(txUiService, 'currentStep', {
               get: () => mockCurrentStep,
               configurable: true,
          });

          // Setup mock client
          mockClient = {
               autofill: jasmine.createSpy().and.returnValue(Promise.resolve({ tx_blob: 'autofilled', hash: 'hash123' })),
               submitAndWait: jasmine.createSpy().and.returnValue(Promise.resolve({ result: { hash: 'tx123' } })),
               submit: jasmine.createSpy().and.returnValue(Promise.resolve({ result: { hash: 'tx123' } })),
               request: jasmine.createSpy().and.callFake((req: any) => {
                    if (req.command === 'simulate') {
                         return Promise.resolve({ result: { engine_result: 'tesSUCCESS' } });
                    }
                    if (req.command === 'tx') {
                         return Promise.resolve({ result: { validated: true, hash: req.transaction } });
                    }
                    return Promise.resolve({});
               }),
               getLedgerIndex: jasmine.createSpy().and.returnValue(Promise.resolve(100)),
          };

          mockWallet = {
               classicAddress: 'rTestAddress',
               sign: jasmine.createSpy().and.returnValue({ tx_blob: 'signed', hash: 'hash123' }),
          };

          utilsService.getMultiSignAddress.and.returnValue(['addr1', 'addr2']);
          utilsService.getMultiSignSeeds.and.returnValue(['seed1', 'seed2']);
          utilsService.handleMultiSignTransaction.and.returnValue(Promise.resolve({ signedTx: { tx_blob: 'multisigned', hash: 'multi123' }, signers: [] }));
          utilsService.isTxSuccessful.and.returnValue(true);
          utilsService.getTransactionResultMessage.and.returnValue('tesSUCCESS');
          utilsService.processErrorMessageFromLedger.and.returnValue('');
          utilsService.encodeIfNeeded.and.callFake((code: string) => code);
          txUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          TestBed.configureTestingModule({
               providers: [XrplTransactionService, { provide: UtilsService, useValue: utilsService }, { provide: ToastService, useValue: toastService }, { provide: TransactionUiService, useValue: txUiService }, { provide: XrplTxOptionsStore, useValue: {} }, { provide: MptStoreService, useValue: mptStoreService }],
          });

          service = TestBed.inject(XrplTransactionService);
     });

     describe('signTransaction', () => {
          const mockTx = { TransactionType: 'Payment', Amount: '1000000' };
          const fee = '12';

          it('should sign transaction without multi-sign', async () => {
               const result = await service.signTransaction(mockClient, mockWallet, mockTx, false, null, fee, false, '', '');

               expect(mockClient.autofill).toHaveBeenCalledWith(mockTx);
               expect(mockWallet.sign).toHaveBeenCalled();
               expect(result).toBeTruthy();
          });

          it('should sign transaction with regular key', async () => {
               const regularKeyWallet = { sign: jasmine.createSpy().and.returnValue({ tx_blob: 'signed', hash: 'hash123' }) };

               const result = await service.signTransaction(mockClient, mockWallet, mockTx, true, regularKeyWallet, fee, false, '', '');

               expect(mockClient.autofill).toHaveBeenCalled();
               expect(regularKeyWallet.sign).toHaveBeenCalled();
               expect(result).toBeTruthy();
          });

          it('should sign transaction with multi-sign', async () => {
               const result = await service.signTransaction(mockClient, mockWallet, mockTx, false, null, fee, true, 'addr1,addr2', 'seed1,seed2');

               expect(utilsService.getMultiSignAddress).toHaveBeenCalledWith('addr1,addr2');
               expect(utilsService.getMultiSignSeeds).toHaveBeenCalledWith('seed1,seed2');
               expect(utilsService.handleMultiSignTransaction).toHaveBeenCalled();
               // Use bracket notation to access Fee property
               expect((mockTx as any).Fee).toBe('36'); // (2 + 1) * 12 = 36
               expect(result?.tx_blob).toBe('multisigned');
          });

          it('should throw error when no signer addresses for multi-sign', async () => {
               utilsService.getMultiSignAddress.and.returnValue([]);

               await expectAsync(service.signTransaction(mockClient, mockWallet, mockTx, false, null, fee, true, '', 'seed1,seed2')).toBeRejectedWithError('No signer addresses provided for multi-signing');
          });

          it('should throw error when no signer seeds for multi-sign', async () => {
               utilsService.getMultiSignSeeds.and.returnValue([]);

               await expectAsync(service.signTransaction(mockClient, mockWallet, mockTx, false, null, fee, true, 'addr1,addr2', '')).toBeRejectedWithError('No signer seeds provided for multi-signing');
          });
     });

     describe('submitAndWaitTransaction', () => {
          it('should submit and wait for transaction', async () => {
               const signedTx = { tx_blob: 'blob', hash: 'hash123' };
               const result = await service.submitAndWaitTransaction(mockClient, signedTx);

               expect(mockClient.submitAndWait).toHaveBeenCalledWith('blob');
               expect(result).toEqual({ result: { hash: 'tx123' } });
          });
     });

     describe('submitTransaction', () => {
          it('should submit transaction', async () => {
               const signedTx = { tx_blob: 'blob', hash: 'hash123' };
               const result = await service.submitTransaction(mockClient, signedTx);

               expect(mockClient.submit).toHaveBeenCalledWith('blob');
               expect(result).toEqual({ result: { hash: 'tx123' } });
          });
     });

     describe('simulateTransaction', () => {
          it('should simulate transaction successfully', async () => {
               const txJson = { TransactionType: 'Payment', Amount: '100' };
               const result = await service.simulateTransaction(mockClient, txJson);

               expect(mockClient.request).toHaveBeenCalledWith({
                    command: 'simulate',
                    tx_json: txJson,
               });
               expect(result?.result?.engine_result).toBe('tesSUCCESS');
          });

          it('should throw error on simulation failure', async () => {
               mockClient.request.and.returnValue(Promise.reject(new Error('Simulation failed')));

               await expectAsync(service.simulateTransaction(mockClient, {})).toBeRejectedWithError('Simulation failed');
          });
     });

     describe('waitForFinalOutcome', () => {
          it('should wait for transaction validation', async () => {
               let callCount = 0;

               // Setup request mock
               mockClient.request.and.callFake((req: any) => {
                    callCount++;
                    if (callCount < 5) {
                         // First few calls: transaction not yet validated
                         return Promise.resolve({ result: { validated: false } });
                    }
                    // After 5 calls: transaction validated
                    return Promise.resolve({ result: { validated: true, hash: req.transaction } });
               });

               // Keep ledger index within range
               let ledgerIndex = 95;
               mockClient.getLedgerIndex.and.callFake(() => Promise.resolve(ledgerIndex));

               // Run the function but don't await it yet
               const promise = service.waitForFinalOutcome(mockClient, 'hash123', 100);

               // Wait a bit for the loop to run
               await new Promise(resolve => setTimeout(resolve, 100));

               // The test will complete naturally
               const result = await promise;

               expect(result).toBeTruthy();
          }, 10000); // Increase timeout to 10 seconds
     });
     describe('processTxFinalResult', () => {
          const finalResult = { meta: { TransactionResult: 'tesSUCCESS' } };
          const message = 'Transaction successful';
          const result = { success: true, hash: 'tx123' };

          it('should handle successful transaction', () => {
               utilsService.isTxSuccessful.and.returnValue(true);

               service.processTxFinalResult(finalResult, message, result);

               expect(toastService.success).toHaveBeenCalled();
          });

          it('should handle failed transaction', () => {
               utilsService.isTxSuccessful.and.returnValue(false);
               utilsService.getTransactionResultMessage.and.returnValue('tecFAIL');

               service.processTxFinalResult(finalResult, message, result);

               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('processTxError', () => {
          it('should handle transaction error', () => {
               service.processTxError(new Error('Error'));
               // Should not throw
               expect(true).toBeTruthy();
          });
     });

     describe('buildSendMaxAmount', () => {
          it('should build XRP send max', () => {
               const result = service.buildSendMaxAmount('XRP', '', '100', false);

               expect(result.paymentType).toBe('XRP');
               expect(result.currency).toBe('XRP');
          });

          it('should build MPT send max', () => {
               const result = service.buildSendMaxAmount('MPT123', '', '100', true);

               expect(result.paymentType).toBe('MPT');
               expect((result.sendMax as any).mpt_issuance_id).toBe('mpt123');
               expect((result.sendMax as any).value).toBe('100');
          });

          it('should build IOU send max', () => {
               utilsService.encodeIfNeeded.and.returnValue('USD');
               const result = service.buildSendMaxAmount('USD', 'rIssuer', '100', false);

               expect(result.paymentType).toBe('IOU');
               expect(result.currency).toBe('USD');
               expect(result.sendMax).toEqual({
                    currency: 'USD',
                    value: '100',
                    issuer: 'rIssuer',
               });
          });
     });

     describe('buildAmount', () => {
          it('should build XRP amount', () => {
               const result = service.buildAmount('XRP', '100', '');

               expect(result.amountToCash).toBeTruthy();
          });

          it('should build IOU amount', () => {
               utilsService.encodeIfNeeded.and.returnValue('USD');
               const result = service.buildAmount('USD', '100', 'rIssuer');

               expect(result.amountToCash).toEqual({
                    value: '100',
                    currency: 'USD',
                    issuer: 'rIssuer',
               });
          });
     });
});
