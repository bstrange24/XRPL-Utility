import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountConfiguratorOrchestratorService } from './account-configurator-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AccountConfiguratorTransactionBuilderService } from '../account-configurator-transaction-builder/account-configurator-transaction-builder.service';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { ACCOUNT_CONFIG_TX_TYPES } from '../../../components/account-configurator/constants/account-configurator.constants';

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

describe('AccountConfiguratorOrchestratorService', () => {
     let service: AccountConfiguratorOrchestratorService;
     let txEnvironmentServiceMock: any;
     let txUiServiceMock: any;
     let validatorMock: any;
     let xrplTransactionServiceMock: any;
     let xrplTransactionOrchestratorServiceMock: any;
     let transactionOptionalFieldsServiceMock: any;
     let sufficentAccountBalanceServiceMock: any;
     let toastServiceMock: any;
     let accountConfiguratorTransactionBuilderServiceMock: any;
     let accountConfiguratorStoreServiceMock: any;
     let xrplDateServiceMock: any;

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

     beforeEach(async () => {
          txEnvironmentServiceMock = {
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo(mockEnv),
          };

          txUiServiceMock = {
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               addTxResultSignal: jasmine.createSpy('addTxResultSignal'),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          validatorMock = {
               validate: jasmine.createSpy('validate').and.resolveTo([]),
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

          sufficentAccountBalanceServiceMock = {
               checkXrpBalance: jasmine.createSpy('checkXrpBalance').and.resolveTo({ success: true }),
          };

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               successMultipleHashes: jasmine.createSpy('successMultipleHashes'),
               successMultipleHashesWithDepositAuth: jasmine.createSpy('successMultipleHashesWithDepositAuth'),
               errorMultipleHashes: jasmine.createSpy('errorMultipleHashes'),
               buildMultiErrorMessage: jasmine.createSpy('buildMultiErrorMessage'),
          };

          accountConfiguratorTransactionBuilderServiceMock = {
               buildModifyAccountSetTransaction: jasmine.createSpy('buildModifyAccountSetTransaction').and.returnValue({ TransactionType: 'AccountSet' }),
               buildModifyDepositAuthTransaction: jasmine.createSpy('buildModifyDepositAuthTransaction').and.returnValue({ TransactionType: 'DepositPreauth' }),
               buildModifyMultiSignTransaction: jasmine.createSpy('buildModifyMultiSignTransaction').and.returnValue({ TransactionType: 'SignerListSet' }),
               buildModifySetRegularKeyTransaction: jasmine.createSpy('buildModifySetRegularKeyTransaction').and.returnValue({ TransactionType: 'SetRegularKey' }),
          };

          accountConfiguratorStoreServiceMock = {};

          xrplDateServiceMock = {};

          await TestBed.configureTestingModule({
               providers: [
                    AccountConfiguratorOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: AccountConfiguratorTransactionBuilderService, useValue: accountConfiguratorTransactionBuilderServiceMock },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreServiceMock },
                    { provide: XrplDateService, useValue: xrplDateServiceMock },
               ],
          });

          service = TestBed.inject(AccountConfiguratorOrchestratorService);
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

     describe('executeModifyAccountTx', () => {
          const config = {
               account: { setFlags: ['1', '2'], clearFlags: [] },
               txOptions: { isSimulateEnabled: false },
               preFetchedEnv: mockEnv,
               wallet: mockWallet,
          };

          it('should execute modify account transaction successfully', async () => {
               const result = await service.executeModifyAccountTx('modifyAccountFlags', config as any);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
          });

          it('should return validation error when validation fails', async () => {
               validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
               const result = await service.executeModifyAccountTx('modifyAccountFlags', config as any);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
          });

          it('should handle insufficient balance', async () => {
               sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient balance' });
               const result = await service.executeModifyAccountTx('modifyAccountFlags', config as any);
               expect(result.success).toBeFalse();
               expect(result.error).toBe('Insufficient balance');
          });

          it('should handle transaction execution error', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: false, error: 'Tx failed' });
               const result = await service.executeModifyAccountTx('modifyAccountFlags', config as any);
               expect(result.success).toBeFalse();
          });

          it('should handle simulation mode', async () => {
               const simulateConfig = {
                    ...config,
                    txOptions: { isSimulateEnabled: true },
               };
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, mode: 'simulate' });
               const result = await service.executeModifyAccountTx('modifyAccountFlags', simulateConfig as any);
               expect(result.success).toBeTrue();
          });
     });

     describe('executeAccountSetFlagsTx', () => {
          const config = {
               wallet: mockWallet,
               preFetchedEnv: mockEnv,
               operations: [
                    { operation: 'SetFlag', flagValue: '1', flagName: 'Flag1' },
                    { operation: 'SetFlag', flagValue: '2', flagName: 'Flag2' },
               ],
               account: {},
               txOptions: { isSimulateEnabled: false },
          };

          it('should execute account set flags transactions successfully', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, hash: mockTxHash });
               const result = await service.executeAccountSetFlagsTx('modifyAccountFlags', config as any);
               expect(result.success).toBeTrue();
               expect(result.modifyCount).toBe(2);
          });

          it('should return validation error when validation fails', async () => {
               validatorMock.validate.and.resolveTo(['Validation error']);
               const result = await service.executeAccountSetFlagsTx('modifyAccountFlags', config as any);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
          });

          it('should handle partial failures', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, hash: mockTxHash }).and.resolveTo({ success: false, error: 'Failed' });
               const result = await service.executeAccountSetFlagsTx('modifyAccountFlags', config as any);
               expect(result.results?.length).toBe(2);
          });
     });

     describe('executeDepositAuthTx', () => {
          const config = {
               wallet: mockWallet,
               preFetchedEnv: mockEnv,
               account: {
                    depositAuthAddresses: [{ account: 'rAddr1' }, { account: 'rAddr2' }],
               },
               txOptions: { isSimulateEnabled: false },
          };

          it('should execute deposit auth transactions successfully', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, hash: mockTxHash });
               const result = await service.executeDepositAuthTx('modifyDepositAuth', config as any);
               expect(result.success).toBeTrue();
               expect(result.modifyCount).toBe(2);
          });

          it('should return validation error when validation fails', async () => {
               validatorMock.validate.and.resolveTo(['Validation error']);
               const result = await service.executeDepositAuthTx('modifyDepositAuth', config as any);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
          });
     });

     describe('runWithConcurrencyLimit', () => {
          it('should process items with concurrency limit', async () => {
               const items = [1, 2, 3, 4, 5];
               const handler = jasmine.createSpy('handler').and.callFake(async (item: number) => item * 2);
               const results = await service.runWithConcurrencyLimit(items, 3, handler);
               expect(results.length).toBe(5);
               expect(handler).toHaveBeenCalledTimes(5);
          });

          it('should handle errors gracefully', async () => {
               const items = [1, 2];
               const handler = jasmine.createSpy('handler').and.callFake(async (item: number) => {
                    if (item === 2) throw new Error('Failed');
                    return item;
               });
               const results = await service.runWithConcurrencyLimit(items, 2, handler);
               expect(results[0]).toBe(1);
               expect(results[1].success).toBeFalse();
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should handle simulation success', () => {
               const config = { account: { test: 'config' } };
               const result = service.handleSimulationSuccess('modifyAccountFlags', config, mockTxHash);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
               expect(toastServiceMock.success).toHaveBeenCalled();
          });
     });
});
