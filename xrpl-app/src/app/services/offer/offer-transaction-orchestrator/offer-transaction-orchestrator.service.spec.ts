import { TestBed } from '@angular/core/testing';
import { OfferTransactionOrchestratorService } from './offer-transaction-orchestrator.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { OfferTransactionBuilderService } from '../offer-transaction-builder/offer-transaction-builder.service';
import { OfferState } from '../offer-store/offer-store.service';
import { OfferTxType, OfferTxConfig } from '../../../components/offer/constants/offer.types';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock classes
class MockTxEnvironmentService {
  prepareTxEnvironment = jasmine.createSpy();
}

class MockXrplTransactionService {
  processTxError = jasmine.createSpy();
  waitForFinalOutcome = jasmine.createSpy();
  processTxFinalResult = jasmine.createSpy();
}

class MockTransactionUiService {
  resetCurrentStepToIdle = jasmine.createSpy();
  clearAllOptionsAndMessages = jasmine.createSpy();
  setTxResultSignal = jasmine.createSpy();
  addTxHashSignal = jasmine.createSpy();
  explorerUrl = jasmine.createSpy().and.returnValue('https://explorer.xrpl.org/');
}

class MockToastService {
  success = jasmine.createSpy();
  error = jasmine.createSpy();
}

class MockTransactionOptionalFieldsService {
  setTxOptionalFields = jasmine.createSpy();
}

class MockSufficentAccountBalanceService {
  checkXrpBalance = jasmine.createSpy();
}

class MockXrplTransactionOrchestratorService {
  executeTx = jasmine.createSpy();
}

class MockOfferTransactionBuilderService {
  buildOfferCreateTx = jasmine.createSpy();
  buildOfferCancelTx = jasmine.createSpy();
}

describe('OfferTransactionOrchestratorService', () => {
  let service: OfferTransactionOrchestratorService;
  let txEnvironmentService: MockTxEnvironmentService;
  let xrplTransactionService: MockXrplTransactionService;
  let txUiService: MockTransactionUiService;
  let toastService: MockToastService;
  let transactionOptionalFieldsService: MockTransactionOptionalFieldsService;
  let sufficentAccountBalanceService: MockSufficentAccountBalanceService;
  let xrplTransactionOrchestratorService: MockXrplTransactionOrchestratorService;
  let offerTransactionBuilderService: MockOfferTransactionBuilderService;
  
  let mockClient: any;
  let mockWallet: any;
  let mockEnv: any;
  let mockOffer: OfferState;
  let mockAccount: any;
  let mockTxOptions: any;

  beforeEach(() => {
    mockClient = {
      request: jasmine.createSpy(),
      getLedgerIndex: jasmine.createSpy().and.returnValue(Promise.resolve(123456))
    };

    mockWallet = {
      classicAddress: 'rTestAddress',
      publicKey: 'testPublicKey',
      privateKey: 'testPrivateKey'
    };

    mockEnv = {
      client: mockClient,
      accountInfo: { Balance: '1000000', Sequence: 1 },
      fee: { txFee: '12' },
      ledgerInfo: { lastIndex: 123456 },
      serverInfo: { info: {} },
      wallet: mockWallet
    };

    mockOffer = {
      weWantCurrency: 'USD',
      weWantIssuer: 'rIssuer1',
      weWantAmount: '100',
      weSpendCurrency: 'XRP',
      weSpendIssuer: '',
      weSpendAmount: '10',
      offerSequenceField: '1,2,3'
    } as any;

    mockAccount = {
      multiSignAddress: 'rMultiSign',
      multiSignSeeds: ['seed1', 'seed2'],
      regularKeySeed: 'regularSeed',
      regularKeyAddress: 'rRegularKey'
    };

    mockTxOptions = {
      isSimulateEnabled: false,
      useMultiSign: false,
      isRegularKeyAddress: false
    };

    txEnvironmentService = new MockTxEnvironmentService();
    xrplTransactionService = new MockXrplTransactionService();
    txUiService = new MockTransactionUiService();
    toastService = new MockToastService();
    transactionOptionalFieldsService = new MockTransactionOptionalFieldsService();
    sufficentAccountBalanceService = new MockSufficentAccountBalanceService();
    xrplTransactionOrchestratorService = new MockXrplTransactionOrchestratorService();
    offerTransactionBuilderService = new MockOfferTransactionBuilderService();

    TestBed.configureTestingModule({
      providers: [
        OfferTransactionOrchestratorService,
        { provide: TxEnvironmentService, useValue: txEnvironmentService },
        { provide: XrplTransactionService, useValue: xrplTransactionService },
        { provide: TransactionUiService, useValue: txUiService },
        { provide: ToastService, useValue: toastService },
        { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsService },
        { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceService },
        { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorService },
        { provide: OfferTransactionBuilderService, useValue: offerTransactionBuilderService }
      ]
    });

    service = TestBed.inject(OfferTransactionOrchestratorService);
  });

  describe('executeOfferTx', () => {
    let config: OfferTxConfig;

    beforeEach(() => {
      config = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: mockTxOptions,
        preFetchedEnv: mockEnv,
        wallet: mockWallet
      };
    });

    it('should reset UI and clear messages on start', async () => {
      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      await service.executeOfferTx('createOffer', config);

      expect(txUiService.resetCurrentStepToIdle).toHaveBeenCalled();
      expect(txUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
    });

    it('should use preFetchedEnv when provided', async () => {
      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      await service.executeOfferTx('createOffer', config);

      expect(txEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
    });

    it('should fetch environment when preFetchedEnv not provided', async () => {
      txEnvironmentService.prepareTxEnvironment.and.returnValue(Promise.resolve(mockEnv));
      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      const configWithoutEnv: OfferTxConfig = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: mockTxOptions,
        preFetchedEnv: undefined,
        wallet: mockWallet
      };
      await service.executeOfferTx('createOffer', configWithoutEnv);

      expect(txEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
        includeAccountInfo: true,
        includeAccountObject: true,
        includeFee: true,
        includeLedgerInfo: true,
        includeServerInfo: true
      });
    });

    it('should throw error when required network data missing', async () => {
      const invalidEnv = { ...mockEnv, accountInfo: null };
      const configWithInvalidEnv: OfferTxConfig = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: mockTxOptions,
        preFetchedEnv: invalidEnv,
        wallet: mockWallet
      };

      const result = await service.executeOfferTx('createOffer', configWithInvalidEnv);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Required network data missing');
    });

    describe('createOffer', () => {
      let mockTx: any;
      let createConfig: OfferTxConfig;

      beforeEach(() => {
        mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
        offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
        transactionOptionalFieldsService.setTxOptionalFields.and.returnValue(Promise.resolve());
        createConfig = {
          offer: mockOffer,
          account: mockAccount,
          txOptions: mockTxOptions,
          preFetchedEnv: mockEnv,
          wallet: mockWallet
        };
      });

      it('should execute create offer successfully', async () => {
        sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
        xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
        xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123' }));

        const result = await service.executeOfferTx('createOffer', createConfig);

        expect(offerTransactionBuilderService.buildOfferCreateTx).toHaveBeenCalledWith(mockWallet, mockOffer, mockEnv);
        expect(transactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
        expect(sufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
        expect(xrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
        expect(xrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
        expect(xrplTransactionService.processTxFinalResult).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.hash).toBe('txHash123');
      });

      it('should handle balance check failure', async () => {
        sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: false, error: 'Insufficient balance' }));

        const result = await service.executeOfferTx('createOffer', createConfig);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Insufficient balance');
      });

      it('should handle executeTx failure', async () => {
        sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
        xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: false, error: 'Transaction failed' }));

        const result = await service.executeOfferTx('createOffer', createConfig);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Transaction failed');
      });

      it('should handle simulation mode', async () => {
        const simulateConfig: OfferTxConfig = {
          ...createConfig,
          txOptions: { ...mockTxOptions, isSimulateEnabled: true }
        };
        sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
        xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'simulate' }));

        const result = await service.executeOfferTx('createOffer', simulateConfig);

        expect(toastService.success).toHaveBeenCalledWith(
          'Simulated Offer Create successfully!',
          AppConstants.TOAST.SUCCESS,
          false,
          'txHash123',
          'https://explorer.xrpl.org/tx/'
        );
        expect(result.success).toBe(true);
        expect(result.hash).toBe('txHash123');
        expect(xrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
      });
    });

   describe('cancelOffer', () => {
  let mockCancelTx: any;
  let cancelConfig: OfferTxConfig;

  beforeEach(() => {
    mockCancelTx = { TransactionType: 'OfferCancel' };
    offerTransactionBuilderService.buildOfferCancelTx.and.returnValue(mockCancelTx);
    transactionOptionalFieldsService.setTxOptionalFields.and.returnValue(Promise.resolve());
    mockClient.getLedgerIndex.and.returnValue(Promise.resolve(123456));
    cancelConfig = {
      offer: mockOffer,
      account: mockAccount,
      txOptions: mockTxOptions,
      preFetchedEnv: mockEnv,
      wallet: mockWallet
    };
  });

  it('should execute cancel offer successfully', async () => {
    xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123' }));

    const result = await service.executeOfferTx('cancelOffer', cancelConfig);

    expect(offerTransactionBuilderService.buildOfferCancelTx).toHaveBeenCalledTimes(3);
    expect(transactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalledTimes(3);
    expect(xrplTransactionOrchestratorService.executeTx).toHaveBeenCalledTimes(3);
    expect(toastService.success).toHaveBeenCalledWith('3 offer(s) cancelled successfully!', AppConstants.TOAST.SUCCESS);
    expect(result.success).toBe(true);
    expect(result.hash).toBe('txHash123');
  });

  it('should handle empty sequences', async () => {
    const offerWithNoSequences = { ...mockOffer, offerSequenceField: '' };
    const configWithNoSequences: OfferTxConfig = {
      ...cancelConfig,
      offer: offerWithNoSequences
    };

    const result = await service.executeOfferTx('cancelOffer', configWithNoSequences);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No offer sequences provided.');
  });

  it('should stop on first failure in sequence', async () => {
    // Clear any previous calls
    xrplTransactionOrchestratorService.executeTx.calls.reset();
    
    // Set up the mock to return success for first call, failure for second
    xrplTransactionOrchestratorService.executeTx
      .and.returnValues(
        Promise.resolve({ success: true, hash: 'txHash1' }),
        Promise.resolve({ success: false, error: 'Second offer failed' })
      );

    const result = await service.executeOfferTx('cancelOffer', cancelConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Second offer failed');
    // Should have been called twice (first success, then failure)
    expect(xrplTransactionOrchestratorService.executeTx).toHaveBeenCalledTimes(2);
  });

  it('should handle simulation mode for cancel', async () => {
    const simulateConfig: OfferTxConfig = {
      ...cancelConfig,
      txOptions: { ...mockTxOptions, isSimulateEnabled: true }
    };
    xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123' }));

    const result = await service.executeOfferTx('cancelOffer', simulateConfig);

    expect(toastService.success).toHaveBeenCalledWith('Simulated cancel of 3 offer(s) successfully!', AppConstants.TOAST.SUCCESS);
    expect(result.success).toBe(true);
  });

  it('should add all tx hashes to UI service', async () => {
    // Clear any previous calls
    txUiService.addTxHashSignal.calls.reset();
    xrplTransactionOrchestratorService.executeTx.calls.reset();
    
    // Set up the mock to return success for all three calls with different hashes
    xrplTransactionOrchestratorService.executeTx
      .and.returnValues(
        Promise.resolve({ success: true, hash: 'txHash1' }),
        Promise.resolve({ success: true, hash: 'txHash2' }),
        Promise.resolve({ success: true, hash: 'txHash3' })
      );

    await service.executeOfferTx('cancelOffer', cancelConfig);

    // Verify each hash was added
    expect(txUiService.addTxHashSignal).toHaveBeenCalledWith('txHash1');
    expect(txUiService.addTxHashSignal).toHaveBeenCalledWith('txHash2');
    expect(txUiService.addTxHashSignal).toHaveBeenCalledWith('txHash3');
    expect(txUiService.addTxHashSignal).toHaveBeenCalledTimes(3);
  });
});

    describe('error handling', () => {
      it('should handle unknown transaction type', async () => {
        const result = await service.executeOfferTx('unknown' as OfferTxType, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown offer transaction type: unknown');
      });

      it('should handle general exceptions', async () => {
        offerTransactionBuilderService.buildOfferCreateTx.and.throwError('Builder error');

        const result = await service.executeOfferTx('createOffer', config);

        expect(xrplTransactionService.processTxError).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Builder error');
      });

      it('should reset current step to idle in finally block', async () => {
        offerTransactionBuilderService.buildOfferCreateTx.and.throwError('Error');

        await service.executeOfferTx('createOffer', config);

        expect(txUiService.resetCurrentStepToIdle).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle wallet from env when not provided in config', async () => {
      const configWithWalletFromEnv: OfferTxConfig = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: mockTxOptions,
        preFetchedEnv: mockEnv,
        wallet: undefined as any
      };

      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      const result = await service.executeOfferTx('createOffer', configWithWalletFromEnv);

      expect(offerTransactionBuilderService.buildOfferCreateTx).toHaveBeenCalledWith(mockWallet, mockOffer, mockEnv);
      expect(result.success).toBe(true);
    });

    it('should handle create offer with multi-sign', async () => {
      const multiSignConfig: OfferTxConfig = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: { ...mockTxOptions, useMultiSign: true },
        preFetchedEnv: mockEnv,
        wallet: mockWallet
      };

      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      const result = await service.executeOfferTx('createOffer', multiSignConfig);

      expect(xrplTransactionOrchestratorService.executeTx).toHaveBeenCalledWith(jasmine.objectContaining({
        signing: jasmine.objectContaining({
          useMultiSign: true,
          multiSignAddress: mockAccount.multiSignAddress,
          multiSignSeeds: mockAccount.multiSignSeeds
        })
      }));
      expect(result.success).toBe(true);
    });

    it('should handle create offer with regular key', async () => {
      const regularKeyConfig: OfferTxConfig = {
        offer: mockOffer,
        account: mockAccount,
        txOptions: { ...mockTxOptions, isRegularKeyAddress: true },
        preFetchedEnv: mockEnv,
        wallet: mockWallet
      };

      const mockTx = { TransactionType: 'OfferCreate', LastLedgerSequence: 123460 };
      offerTransactionBuilderService.buildOfferCreateTx.and.returnValue(mockTx);
      sufficentAccountBalanceService.checkXrpBalance.and.returnValue(Promise.resolve({ success: true }));
      xrplTransactionOrchestratorService.executeTx.and.returnValue(Promise.resolve({ success: true, hash: 'txHash123', mode: 'submit' }));
      xrplTransactionService.waitForFinalOutcome.and.returnValue(Promise.resolve({ success: true }));

      const result = await service.executeOfferTx('createOffer', regularKeyConfig);

      expect(xrplTransactionOrchestratorService.executeTx).toHaveBeenCalledWith(jasmine.objectContaining({
        signing: jasmine.objectContaining({
          isRegularKeyAddress: true,
          regularKeySeed: mockAccount.regularKeySeed,
          regularKeyAddress: mockAccount.regularKeyAddress
        })
      }));
      expect(result.success).toBe(true);
    });
  });
});