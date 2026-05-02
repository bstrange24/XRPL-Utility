import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DidTransactionOrchestratorService } from './did-transaction-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { DidTransactionBuilderService } from '../did-transaction-builder/did-transaction-builder.service';
import { DidUtilService } from '../did-util/did-util.service';
import { DidStoreService } from '../did-store/did-store.service';
import { AppConstants } from '../../../core/app.constants';

// Mock Performance API
beforeAll(() => {
     const mockPerformance = {
          mark: jasmine.createSpy('mark'),
          measure: jasmine.createSpy('measure'),
          clearMarks: jasmine.createSpy('clearMarks'),
          clearMeasures: jasmine.createSpy('clearMeasures'),
          getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]),
     };
     Object.defineProperty(window, 'performance', {
          value: mockPerformance,
          configurable: true,
          writable: true,
     });
});

describe('DidTransactionOrchestratorService', () => {
     let service: DidTransactionOrchestratorService;
     let txEnvironmentServiceMock: any;
     let validatorMock: any;
     let xrplTransactionServiceMock: any;
     let txUiServiceMock: any;
     let toastServiceMock: any;
     let transactionOptionalFieldsServiceMock: any;
     let sufficentAccountBalanceServiceMock: any;
     let xrplTransactionOrchestratorServiceMock: any;
     let didTransactionBuilderServiceMock: any;
     let didUtilServiceMock: any;
     let didStoreServiceMock: any;

     const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', seed: 'seed123' };
     const mockClient = { disconnect: jasmine.createSpy('disconnect') };
     const mockEnv = {
          client: mockClient,
          wallet: mockWallet,
          accountInfo: { result: { account_data: { Sequence: 100 } } },
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
     };
     const mockTxHash = 'txHash123';
     const mockTx = { TransactionType: 'DIDSet', Sequence: 100 };

     const mockDid = {
          didDocumentData: '{"did":"did:example:123"}',
          uriData: 'https://example.com/did',
          didData: '{"did":"did:example:456"}',
     };

     beforeEach(() => {
          txEnvironmentServiceMock = {
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo(mockEnv),
          };

          validatorMock = {
               validate: jasmine.createSpy('validate').and.resolveTo([]),
          };

          xrplTransactionServiceMock = {
               waitForFinalOutcome: jasmine.createSpy('waitForFinalOutcome').and.resolveTo({ success: true }),
               processTxFinalResult: jasmine.createSpy('processTxFinalResult'),
               processTxError: jasmine.createSpy('processTxError'),
          };

          txUiServiceMock = {
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               info: jasmine.createSpy('info'),
          };

          transactionOptionalFieldsServiceMock = {
               setTxOptionalFields: jasmine.createSpy('setTxOptionalFields').and.resolveTo(),
          };

          sufficentAccountBalanceServiceMock = {
               checkXrpBalance: jasmine.createSpy('checkXrpBalance').and.resolveTo({ success: true }),
          };

          xrplTransactionOrchestratorServiceMock = {
               executeTx: jasmine.createSpy('executeTx').and.resolveTo({ success: true, hash: mockTxHash, mode: 'submit' }),
          };

          didTransactionBuilderServiceMock = {
               buildDidSetTransaction: jasmine.createSpy('buildDidSetTransaction').and.returnValue(mockTx),
               buildDidDeleteTransaction: jasmine.createSpy('buildDidDeleteTransaction').and.returnValue(mockTx),
          };

          didUtilServiceMock = {};

          didStoreServiceMock = {};

          TestBed.configureTestingModule({
               providers: [
                    DidTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: DidTransactionBuilderService, useValue: didTransactionBuilderServiceMock },
                    { provide: DidUtilService, useValue: didUtilServiceMock },
                    { provide: DidStoreService, useValue: didStoreServiceMock },
               ],
          });

          service = TestBed.inject(DidTransactionOrchestratorService);
     });

     afterEach(() => {
          if (txEnvironmentServiceMock.prepareTxEnvironment) {
               txEnvironmentServiceMock.prepareTxEnvironment.calls.reset();
          }
          if (validatorMock.validate) {
               validatorMock.validate.calls.reset();
          }
          if (xrplTransactionOrchestratorServiceMock.executeTx) {
               xrplTransactionOrchestratorServiceMock.executeTx.calls.reset();
          }
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('executeDidTx', () => {
          const baseConfig = {
               did: mockDid,
               account: {},
               txOptions: { isSimulateEnabled: false },
               preFetchedEnv: mockEnv,
               wallet: mockWallet,
          };

          describe('setDid', () => {
               it('should execute setDid transaction successfully', async () => {
                    const result = await service.executeDidTx('setDid', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe(mockTxHash);
                    expect(didTransactionBuilderServiceMock.buildDidSetTransaction).toHaveBeenCalled();
               });
          });

          describe('deleteDid', () => {
               it('should execute deleteDid transaction successfully', async () => {
                    const result = await service.executeDidTx('deleteDid', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(didTransactionBuilderServiceMock.buildDidDeleteTransaction).toHaveBeenCalled();
               });
          });

          describe('Common behavior', () => {
               it('should return validation error when validation fails', async () => {
                    validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
                    const result = await service.executeDidTx('setDid', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Error 1');
               });

               it('should handle transaction execution error', async () => {
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: false, error: 'Tx failed' });
                    const result = await service.executeDidTx('setDid', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Tx failed');
               });

               it('should handle simulation mode', async () => {
                    const simulateConfig = {
                         ...baseConfig,
                         txOptions: { isSimulateEnabled: true },
                    };
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, mode: 'simulate', hash: mockTxHash });
                    const result = await service.executeDidTx('setDid', simulateConfig as any);
                    expect(result.success).toBeTrue();
                    expect(toastServiceMock.success).toHaveBeenCalled();
               });

               // it('should handle missing network data', async () => {
               //      txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo({ client: mockClient });
               //      const result = await service.executeDidTx('setDid', baseConfig as any);
               //      expect(result.success).toBeFalse();
               //      expect(result.error).toBeDefined();
               // });

               it('should handle insufficient balance', async () => {
                    sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient balance' });
                    const result = await service.executeDidTx('setDid', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient balance');
               });

               // it('should handle generic error', async () => {
               //      txEnvironmentServiceMock.prepareTxEnvironment.and.rejectWith(new Error('Network error'));
               //      const result = await service.executeDidTx('setDid', baseConfig as any);
               //      expect(result.success).toBeFalse();
               //      expect(xrplTransactionServiceMock.processTxError).toHaveBeenCalled();
               // });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should handle simulation success for setDid', () => {
               const result = service.handleSimulationSuccess('setDid', mockDid, mockTxHash);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
               expect(toastServiceMock.success).toHaveBeenCalled();
          });

          it('should handle simulation success for deleteDid', () => {
               const result = service.handleSimulationSuccess('deleteDid', mockDid, mockTxHash);
               expect(result.success).toBeTrue();
               expect(toastServiceMock.success).toHaveBeenCalled();
          });
     });
});
