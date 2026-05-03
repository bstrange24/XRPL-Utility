import { TestBed } from '@angular/core/testing';
import { XrplTransactionOrchestratorService } from './xrpl-transaction-orchestrator.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { ExecuteTxParams, TxOrchestratorResult } from './xrpl-transaction-orchestrator.types';
import * as xrpl from 'xrpl';

// Mock services
class MockXrplTransactionService {
  simulateTransaction = jasmine.createSpy();
  signTransaction = jasmine.createSpy();
  submitTransaction = jasmine.createSpy();
  submitAndWaitTransaction = jasmine.createSpy();
}

class MockUtilsService {
  isInsufficientXrpBalance1 = jasmine.createSpy();
  getRegularKeyWallet = jasmine.createSpy();
  isTxSuccessful = jasmine.createSpy();
  getTransactionResultMessage = jasmine.createSpy();
  processErrorMessageFromLedger = jasmine.createSpy();
}

class MockTransactionUiService {
  setError = jasmine.createSpy();
  addTxSignal = jasmine.createSpy();
  addTxResultSignal = jasmine.createSpy();
  addTxHashSignal = jasmine.createSpy();
  setSuccess = jasmine.createSpy();
  currentStep = { set: jasmine.createSpy() };
  result = jasmine.createSpy().and.returnValue('Transaction successful');
}

describe('XrplTransactionOrchestratorService', () => {
  let service: XrplTransactionOrchestratorService;
  let xrplTransactions: MockXrplTransactionService;
  let utilsService: MockUtilsService;
  let txUiService: MockTransactionUiService;
  let mockClient: any;
  let mockWallet: any;
  let mockEnv: any;

  beforeEach(() => {
    mockClient = { request: jasmine.createSpy() };
    mockWallet = { classicAddress: 'rTestAddress' };
    mockEnv = {
      accountInfo: { Balance: '1000000', OwnerCount: 0 },
      accountObjects: { result: { account_objects: [] } },
      fee: '12',
      serverInfo: { result: { info: { validated_ledger: { reserve_base_xrp: 10, reserve_inc_xrp: 0.2 } } } }
    };

    xrplTransactions = new MockXrplTransactionService();
    utilsService = new MockUtilsService();
    txUiService = new MockTransactionUiService();

    TestBed.configureTestingModule({
      providers: [
        XrplTransactionOrchestratorService,
        { provide: XrplTransactionService, useValue: xrplTransactions },
        { provide: UtilsService, useValue: utilsService },
        { provide: TransactionUiService, useValue: txUiService }
      ]
    });

    service = TestBed.inject(XrplTransactionOrchestratorService);
  });

  describe('executeTx', () => {
    let baseParams: ExecuteTxParams<any>;

    beforeEach(() => {
      // Reset all mocks before each test
      xrplTransactions.signTransaction.calls.reset();
      xrplTransactions.submitTransaction.calls.reset();
      xrplTransactions.simulateTransaction.calls.reset();
      utilsService.isTxSuccessful.calls.reset();
      utilsService.getRegularKeyWallet.calls.reset();
      txUiService.setError.calls.reset();
      txUiService.addTxSignal.calls.reset();
      txUiService.addTxResultSignal.calls.reset();
      txUiService.addTxHashSignal.calls.reset();
      
      baseParams = {
        client: mockClient,
        wallet: mockWallet,
        env: mockEnv,
        mode: 'submit',
        buildTx: jasmine.createSpy().and.returnValue(Promise.resolve({ TransactionType: 'Payment' })),
        validate: undefined,
        skipBalanceCheck: true,
        ui: { suppressIndividualFeedback: false, suppressPreview: false },
        signing: {
          useMultiSign: false,
          multiSignAddress: '',
          multiSignSeeds: '',
          regularKeyAddress: '',
          isRegularKeyAddress: false,
          regularKeySeed: ''
        }
      };
      
      // Default mock for successful transaction
      utilsService.getRegularKeyWallet.and.returnValue(Promise.resolve({ useRegularKeyWalletSignTx: false, regularKeyWalletSignTx: null }));
      xrplTransactions.signTransaction.and.returnValue(Promise.resolve({ signed: true, tx_blob: 'blob' }));
      xrplTransactions.submitTransaction.and.returnValue(Promise.resolve({ result: { engine_result: 'tesSUCCESS', hash: 'tx123' } }));
      utilsService.isTxSuccessful.and.callFake((response: any) => {
        return response?.result?.engine_result === 'tesSUCCESS';
      });
    });

    describe('Transaction Building', () => {
      it('should build transaction successfully', async () => {
        const mockTx = { TransactionType: 'Payment', Amount: '1000000' };
        baseParams.buildTx = jasmine.createSpy().and.returnValue(Promise.resolve(mockTx));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(baseParams.buildTx).toHaveBeenCalled();
      });

      it('should handle build transaction error', async () => {
        baseParams.buildTx = jasmine.createSpy().and.returnValue(Promise.reject(new Error('Build failed')));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Build failed');
        expect(txUiService.setError).toHaveBeenCalledWith('Build failed');
      });
    });

    describe('Validation', () => {
      it('should validate successfully with no errors', async () => {
        baseParams.validate = jasmine.createSpy().and.returnValue(Promise.resolve([]));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(baseParams.validate).toHaveBeenCalled();
      });

      it('should handle validation errors', async () => {
        baseParams.validate = jasmine.createSpy().and.returnValue(Promise.resolve(['Invalid amount', 'Missing field']));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toContain('Errors:');
        expect(txUiService.setError).toHaveBeenCalled();
      });

      it('should handle single validation error', async () => {
        baseParams.validate = jasmine.createSpy().and.returnValue(Promise.resolve(['Invalid amount']));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Invalid amount');
      });

      it('should handle validation function error', async () => {
        baseParams.validate = jasmine.createSpy().and.returnValue(Promise.reject(new Error('Validation crashed')));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Validation crashed');
      });
    });

    describe('Balance Check', () => {
      it('should skip balance check when skipBalanceCheck is true', async () => {
        baseParams.skipBalanceCheck = true;

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(utilsService.isInsufficientXrpBalance1).not.toHaveBeenCalled();
      });

      it('should check balance and fail if insufficient', async () => {
        baseParams.skipBalanceCheck = false;
        utilsService.isInsufficientXrpBalance1.and.returnValue(true);

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Insufficient XRP to complete transaction');
        expect(txUiService.setError).toHaveBeenCalled();
      });

      it('should handle balance check error', async () => {
        baseParams.skipBalanceCheck = false;
        utilsService.isInsufficientXrpBalance1.and.throwError('Balance check failed');

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Balance check failed');
      });
    });

    describe('Preview', () => {
      it('should add tx signal when not suppressed', async () => {
        baseParams.ui = { suppressPreview: false };
        const mockTx = { TransactionType: 'Payment' };
        baseParams.buildTx = jasmine.createSpy().and.returnValue(Promise.resolve(mockTx));

        await service.executeTx(baseParams);

        expect(txUiService.addTxSignal).toHaveBeenCalledWith(mockTx);
      });

      it('should skip preview when suppressed', async () => {
        baseParams.ui = { suppressPreview: true };
        baseParams.buildTx = jasmine.createSpy().and.returnValue(Promise.resolve({}));

        await service.executeTx(baseParams);

        expect(txUiService.addTxSignal).not.toHaveBeenCalled();
      });
    });

    describe('Submit Mode', () => {
      it('should submit transaction successfully', async () => {
        baseParams.mode = 'submit';

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect((result as any).hash).toBe('tx123');
        expect(txUiService.currentStep.set).toHaveBeenCalledWith('waiting_validation');
        expect(xrplTransactions.signTransaction).toHaveBeenCalled();
        expect(xrplTransactions.submitTransaction).toHaveBeenCalled();
      });

      it('should handle regular key signing', async () => {
        utilsService.getRegularKeyWallet.and.returnValue(Promise.resolve({ useRegularKeyWalletSignTx: true, regularKeyWalletSignTx: { classicAddress: 'rRegularKey' } }));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(utilsService.getRegularKeyWallet).toHaveBeenCalled();
      });

      it('should handle multi-sign transaction', async () => {
        baseParams.signing = {
          useMultiSign: true,
          multiSignAddress: 'rMultiSign',
          multiSignSeeds: 'seed1,seed2',
          regularKeyAddress: '',
          isRegularKeyAddress: false,
          regularKeySeed: ''
        };

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(xrplTransactions.signTransaction).toHaveBeenCalled();
      });

      it('should handle missing fee', async () => {
        baseParams.env = { ...mockEnv, fee: undefined };

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Missing fee in env');
      });

      it('should handle sign transaction failure', async () => {
        xrplTransactions.signTransaction.and.returnValue(Promise.resolve(null));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Failed to sign transaction.');
      });
    });

    describe('Simulate Mode', () => {
      it('should simulate transaction successfully', async () => {
        baseParams.mode = 'simulate';
        xrplTransactions.simulateTransaction.and.returnValue(Promise.resolve({ result: { engine_result: 'tesSUCCESS' } }));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(xrplTransactions.simulateTransaction).toHaveBeenCalled();
        expect(xrplTransactions.signTransaction).not.toHaveBeenCalled();
      });

      it('should handle simulate transaction failure', async () => {
        baseParams.mode = 'simulate';
        xrplTransactions.simulateTransaction.and.returnValue(Promise.resolve({ result: { engine_result: 'tecFAIL' } }));
        utilsService.isTxSuccessful.and.returnValue(false);
        utilsService.getTransactionResultMessage.and.returnValue('tecFAIL');
        utilsService.processErrorMessageFromLedger.and.returnValue('Transaction failed');

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect(txUiService.setError).toHaveBeenCalled();
      });
    });

    describe('Transaction Response Handling', () => {
      it('should handle successful transaction with response', async () => {
        const mockResponse = { result: { engine_result: 'tesSUCCESS', hash: 'tx123' } };
        xrplTransactions.submitTransaction.and.returnValue(Promise.resolve(mockResponse));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect((result as any).hash).toBe('tx123');
        expect(txUiService.addTxResultSignal).toHaveBeenCalledWith(mockResponse.result);
        expect(txUiService.addTxHashSignal).toHaveBeenCalledWith('tx123');
      });

      it('should handle transaction with hash in tx_json', async () => {
        const mockResponse = { result: { engine_result: 'tesSUCCESS', tx_json: { hash: 'tx456' } } };
        xrplTransactions.submitTransaction.and.returnValue(Promise.resolve(mockResponse));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect((result as any).hash).toBe('tx456');
      });

      it('should suppress individual feedback when configured', async () => {
        baseParams.ui = { suppressIndividualFeedback: true };

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(true);
        expect(txUiService.addTxHashSignal).not.toHaveBeenCalled();
        expect(txUiService.setSuccess).not.toHaveBeenCalled();
      });

      it('should handle failed transaction response', async () => {
        const mockResponse = { result: { engine_result: 'tecFAIL' } };
        xrplTransactions.submitTransaction.and.returnValue(Promise.resolve(mockResponse));
        utilsService.isTxSuccessful.and.returnValue(false);
        utilsService.getTransactionResultMessage.and.returnValue('tecFAIL');
        utilsService.processErrorMessageFromLedger.and.returnValue('Transaction failed due to insufficient funds');

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toContain('Transaction failed');
        expect(txUiService.addTxResultSignal).toHaveBeenCalled();
        expect(txUiService.setError).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle general exception in try block', async () => {
        baseParams.buildTx = jasmine.createSpy().and.throwError('Unexpected error');

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Unexpected error');
      });

      it('should handle submit transaction exception', async () => {
        xrplTransactions.submitTransaction.and.returnValue(Promise.reject(new Error('Network error')));

        const result = await service.executeTx(baseParams);

        expect(result.success).toBe(false);
        expect((result as any).error).toBe('Network error');
        expect(txUiService.setError).toHaveBeenCalled();
      });
    });

    describe('Default Values', () => {
      it('should use default values when not provided', async () => {
        const minimalParams = {
          client: mockClient,
          wallet: mockWallet,
          env: mockEnv,
          mode: 'submit',
          buildTx: jasmine.createSpy().and.returnValue(Promise.resolve({}))
        };
        
        const result = await service.executeTx(minimalParams as any);

        expect(result.success).toBe(true);
      });
    });
  });
});