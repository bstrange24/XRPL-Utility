import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AmmTransactionOrchestratorService } from './amm-transaction-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { AmmTransactionBuilderService } from '../amm-transaction-builder/amm-transaction-builder.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AMM_VALIDATION_RULES } from '../../../components/amm/constants/amm.constants';

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

describe('AmmTransactionOrchestratorService', () => {
     let service: AmmTransactionOrchestratorService;
     let txEnvironmentServiceMock: any;
     let validatorMock: any;
     let xrplTransactionServiceMock: any;
     let txUiServiceMock: any;
     let toastServiceMock: any;
     let transactionOptionalFieldsServiceMock: any;
     let sufficentAccountBalanceServiceMock: any;
     let xrplTransactionOrchestratorServiceMock: any;
     let ammStoreServiceMock: any;
     let ammTransactionBuilderServiceMock: any;
     let xrplServiceMock: any;

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
     const mockTx = { TransactionType: 'AMMCreate', Sequence: 100 };
     const mockLpToken = {
          currency: 'LP_TOKEN',
          issuer: 'rLPIssuer',
          balance: '1000',
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

          ammStoreServiceMock = {};

          ammTransactionBuilderServiceMock = {
               buildCreateAmmTx: jasmine.createSpy('buildCreateAmmTx').and.returnValue(mockTx),
               buildDepositToAmmTx: jasmine.createSpy('buildDepositToAmmTx').and.returnValue(mockTx),
               buildWithdrawFromAmmTx: jasmine.createSpy('buildWithdrawFromAmmTx').and.returnValue(mockTx),
               buildClawbackFromAmmTx: jasmine.createSpy('buildClawbackFromAmmTx').and.returnValue(mockTx),
               buildSwapViaAmmTx: jasmine.createSpy('buildSwapViaAmmTx').and.returnValue(mockTx),
               buildDeleteAmmTx: jasmine.createSpy('buildDeleteAmmTx').and.returnValue(mockTx),
               toXRPLCurrency: jasmine.createSpy('toXRPLCurrency').and.returnValue({ currency: 'USD', issuer: 'rIssuer' }),
          };

          xrplServiceMock = {
               getAMMInfo: jasmine.createSpy('getAMMInfo').and.resolveTo({
                    result: {
                         amm: {
                              account: 'rAMMAccount',
                              lp_token: { currency: 'LP_TOKEN', value: '1000' },
                         },
                    },
               }),
          };

          TestBed.configureTestingModule({
               providers: [
                    AmmTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: AmmStoreService, useValue: ammStoreServiceMock },
                    { provide: AmmTransactionBuilderService, useValue: ammTransactionBuilderServiceMock },
                    { provide: XrplService, useValue: xrplServiceMock },
               ],
          });

          service = TestBed.inject(AmmTransactionOrchestratorService);
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

     describe('executeAmmTx', () => {
          const baseConfig = {
               amm: {
                    weWantCurrency: 'USD',
                    weSpendCurrency: 'XRP',
                    weWantIssuer: 'rIssuer1',
                    weSpendIssuer: '',
                    weWantAmount: '100',
                    weSpendAmount: '50',
                    tradingFeeField: '50',
                    withdrawlLpTokenFromPoolField: '100',
               },
               account: {},
               txOptions: { isSimulateEnabled: false },
               preFetchedEnv: mockEnv,
               wallet: mockWallet,
               extra: {},
          };

          describe('createAMM', () => {
               it('should execute createAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('createAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe(mockTxHash);
                    expect(ammTransactionBuilderServiceMock.buildCreateAmmTx).toHaveBeenCalled();
               });
          });

          describe('depositToAMM', () => {
               it('should execute depositToAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('depositToAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(ammTransactionBuilderServiceMock.buildDepositToAmmTx).toHaveBeenCalled();
               });
          });

          describe('withdrawalFromAMM', () => {
               it('should execute withdrawalFromAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('withdrawalFromAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(ammTransactionBuilderServiceMock.buildWithdrawFromAmmTx).toHaveBeenCalled();
               });

               it('should return error when requested LP token exceeds balance', async () => {
                    const configWithLargeWithdrawal = {
                         ...baseConfig,
                         amm: {
                              ...baseConfig.amm,
                              withdrawlLpTokenFromPoolField: '9999',
                         },
                    };
                    const result = await service.executeAmmTx('withdrawalFromAMM', configWithLargeWithdrawal as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Insufficient LP token balance');
               });

               it('should return error when LP token not found', async () => {
                    xrplServiceMock.getAMMInfo.and.rejectWith(new Error('Pool not found'));
                    const result = await service.executeAmmTx('withdrawalFromAMM', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('No LP token found for this AMM pool.');
               });
          });

          describe('clawbackFromAMM', () => {
               it('should execute clawbackFromAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('clawbackFromAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(ammTransactionBuilderServiceMock.buildClawbackFromAmmTx).toHaveBeenCalled();
               });

               it('should return error when LP token not found', async () => {
                    xrplServiceMock.getAMMInfo.and.rejectWith(new Error('Pool not found'));
                    const result = await service.executeAmmTx('clawbackFromAMM', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('No LP token found for this AMM pool.');
               });
          });

          describe('swapViaAMM', () => {
               it('should execute swapViaAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('swapViaAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(ammTransactionBuilderServiceMock.buildSwapViaAmmTx).toHaveBeenCalled();
               });
          });

          describe('deleteAMM', () => {
               it('should execute deleteAMM transaction successfully', async () => {
                    const result = await service.executeAmmTx('deleteAMM', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(ammTransactionBuilderServiceMock.buildDeleteAmmTx).toHaveBeenCalled();
               });
          });

          describe('Common behavior', () => {
               it('should return validation error when validation fails', async () => {
                    validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
                    const result = await service.executeAmmTx('createAMM', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Error 1');
               });

               it('should handle transaction execution error', async () => {
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: false, error: 'Tx failed' });
                    const result = await service.executeAmmTx('createAMM', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Tx failed');
               });

               it('should handle simulation mode', async () => {
                    const simulateConfig = {
                         ...baseConfig,
                         txOptions: { isSimulateEnabled: true },
                    };
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, mode: 'simulate', hash: mockTxHash });
                    const result = await service.executeAmmTx('createAMM', simulateConfig as any);
                    expect(result.success).toBeTrue();
                    expect(toastServiceMock.success).toHaveBeenCalled();
               });

               // it('should handle missing network data', async () => {
               //      txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo({ client: mockClient });
               //      const result = await service.executeAmmTx('createAMM', baseConfig as any);
               //      expect(result.success).toBeFalse();
               //      expect(result.error).toBeDefined();
               // });

               it('should handle insufficient balance', async () => {
                    sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient balance' });
                    const result = await service.executeAmmTx('createAMM', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient balance');
               });

               it('should handle unknown transaction type', async () => {
                    const result = await service.executeAmmTx('unknown' as any, baseConfig as any);
                    expect(result.success).toBeFalse();
               });
          });
     });

     describe('getSimulationMessage', () => {
          it('should return correct message for createAMM', () => {
               const msg = (service as any).getSimulationMessage('createAMM');
               expect(msg).toBe('Simulated AMM Create successfully!');
          });

          it('should return correct message for depositToAMM', () => {
               const msg = (service as any).getSimulationMessage('depositToAMM');
               expect(msg).toBe('Simulated AMM Deposit successfully!');
          });

          it('should return correct message for withdrawalFromAMM', () => {
               const msg = (service as any).getSimulationMessage('withdrawalFromAMM');
               expect(msg).toBe('Simulated AMM Withdraw successfully!');
          });

          it('should return default message for unknown type', () => {
               const msg = (service as any).getSimulationMessage('unknown');
               expect(msg).toBe('Simulated transaction successfully!');
          });
     });

     describe('getSuccessMessage', () => {
          it('should return correct message for createAMM', () => {
               const msg = (service as any).getSuccessMessage('createAMM');
               expect(msg).toBe('AMM created successfully!');
          });

          it('should return correct message for deleteAMM', () => {
               const msg = (service as any).getSuccessMessage('deleteAMM');
               expect(msg).toBe('AMM deleted successfully!');
          });
     });
});
