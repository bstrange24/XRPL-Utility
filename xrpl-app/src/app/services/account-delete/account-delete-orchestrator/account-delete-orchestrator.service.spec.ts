import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDeleteOrchestratorService } from './account-delete-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AccountDeleteTransactionBuilderService } from '../account-delete-transaction-builder/account-delete-transaction-builder.service';
import { AccountDeleteUtilService } from '../account-delete-util/account-delete-util.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { ACCOUNT_DELETE_TX_TYPES } from '../../../components/account-delete/constants/account-delete.constants';

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

describe('AccountDeleteOrchestratorService', () => {
     let service: AccountDeleteOrchestratorService;
     let txEnvironmentServiceMock: any;
     let validatorMock: any;
     let txUiServiceMock: any;
     let xrplTransactionServiceMock: any;
     let xrplTransactionOrchestratorServiceMock: any;
     let transactionOptionalFieldsServiceMock: any;
     let toastServiceMock: any;
     let accountDeleteTransactionBuilderServiceMock: any;
     let accountDeleteUtilServiceMock: any;
     let accountDeleteStoreServiceMock: any;
     let xrplTxOptionsStoreMock: any;

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
     const mockTxResult = { success: true, hash: mockTxHash };
     const mockTx = { TransactionType: 'AccountDelete', Sequence: 100 };

     beforeEach(() => {
          txEnvironmentServiceMock = {
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo(mockEnv),
          };

          validatorMock = {
               validate: jasmine.createSpy('validate').and.resolveTo([]),
          };

          txUiServiceMock = {
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               addTxResultSignal: jasmine.createSpy('addTxResultSignal'),
          };

          xrplTransactionServiceMock = {
               waitForFinalOutcome: jasmine.createSpy('waitForFinalOutcome').and.resolveTo({ success: true }),
               processTxFinalResult: jasmine.createSpy('processTxFinalResult'),
               processTxError: jasmine.createSpy('processTxError'),
          };

          xrplTransactionOrchestratorServiceMock = {
               executeTx: jasmine.createSpy('executeTx').and.resolveTo({ success: true, hash: mockTxHash, mode: 'submit' }),
          };

          transactionOptionalFieldsServiceMock = {
               setTxOptionalFields: jasmine.createSpy('setTxOptionalFields').and.resolveTo(),
          };

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               info: jasmine.createSpy('info'),
          };

          accountDeleteTransactionBuilderServiceMock = {
               buildAccountDeleteTx: jasmine.createSpy('buildAccountDeleteTx').and.returnValue(mockTx),
          };

          accountDeleteUtilServiceMock = {};

          accountDeleteStoreServiceMock = {};

          xrplTxOptionsStoreMock = {};

          TestBed.configureTestingModule({
               providers: [
                    AccountDeleteOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: AccountDeleteTransactionBuilderService, useValue: accountDeleteTransactionBuilderServiceMock },
                    { provide: AccountDeleteUtilService, useValue: accountDeleteUtilServiceMock },
                    { provide: AccountDeleteStoreService, useValue: accountDeleteStoreServiceMock },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStoreMock },
               ],
          });

          service = TestBed.inject(AccountDeleteOrchestratorService);
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

     describe('executeDeleteAccountTx', () => {
          const config = {
               accountDelete: { destination: 'rDestination' },
               account: { regularKeyAddress: '', regularKeySeed: '' },
               txOptions: { isSimulateEnabled: false, isRegularKeyAddress: false },
               preFetchedEnv: mockEnv,
               wallet: mockWallet,
          };

          it('should execute delete account transaction successfully', async () => {
               const result = await service.executeDeleteAccountTx('deleteAccount', config as any);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
          });

          it('should return validation error when validation fails', async () => {
               validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
               const result = await service.executeDeleteAccountTx('deleteAccount', config as any);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
               expect(result.error).toContain('Error 1');
          });

          it('should handle transaction execution error', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: false, error: 'Tx failed' });
               const result = await service.executeDeleteAccountTx('deleteAccount', config as any);
               expect(result.success).toBeFalse();
               expect(result.error).toBe('Tx failed');
          });

          it('should handle simulation mode', async () => {
               const simulateConfig = {
                    ...config,
                    txOptions: { isSimulateEnabled: true },
               };
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, mode: 'simulate', hash: mockTxHash });
               const result = await service.executeDeleteAccountTx('deleteAccount', simulateConfig as any);
               expect(result.success).toBeTrue();
               expect(toastServiceMock.success).toHaveBeenCalled();
          });

          // it('should handle missing network data', async () => {
          //      txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo({ client: mockClient });
          //      const result = await service.executeDeleteAccountTx('deleteAccount', config as any);
          //      expect(result.success).toBeFalse();
          //      expect(result.error).toBeDefined();
          // });

          // it('should handle generic error', async () => {
          //      txEnvironmentServiceMock.prepareTxEnvironment.and.rejectWith(new Error('Network error'));
          //      const result = await service.executeDeleteAccountTx('deleteAccount', config as any);
          //      expect(result.success).toBeFalse();
          //      expect(xrplTransactionServiceMock.processTxError).toHaveBeenCalled();
          // });
     });

     describe('handleSimulationSuccess', () => {
          it('should handle simulation success', () => {
               const result = service.handleSimulationSuccess(mockEnv, mockTxHash);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
               expect(toastServiceMock.success).toHaveBeenCalled();
               expect(txUiServiceMock.resetCurrentStepToIdle).toHaveBeenCalled();
          });

          it('should handle simulation success without hash', () => {
               const result = service.handleSimulationSuccess(mockEnv);
               expect(result.success).toBeTrue();
               expect(toastServiceMock.success).toHaveBeenCalled();
          });
     });
});
