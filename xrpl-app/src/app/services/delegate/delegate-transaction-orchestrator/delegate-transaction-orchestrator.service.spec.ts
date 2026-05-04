import { TestBed } from '@angular/core/testing';
import { DelegateTransactionOrchestratorService } from './delegate-transaction-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { DelegateTransactionBuilderService } from '../delegate-transaction-builder/delegate-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { DelegateTxConfig } from '../../../components/delegate/constants/delegate.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('DelegateTransactionOrchestratorService', () => {
     let service: DelegateTransactionOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockDelegateTransactionBuilderService: jasmine.SpyObj<DelegateTransactionBuilderService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;

     const mockWallet: Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
     } as any;

     // Mock Delegate State
     const baseDelegate: any = {
          ticketId: 'ticket123',
     };

     // Mock Delegate transaction
     const mockDelegateTx: any = {
          TransactionType: 'Delegate',
          Account: 'rTestAddress1234567890',
          Delegate: {
               DelegateAddress: 'rDelegate123',
               DelegateAmount: '1000',
          },
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockEnv: any = {
          client: { disconnect: jasmine.createSpy() },
          accountInfo: { Balance: '10000000' },
          fee: '12',
          ledgerInfo: { lastIndex: 1000 },
          accountObjects: { result: { account_objects: [] } },
          wallet: mockWallet,
     };

     beforeEach(() => {
          mockTxEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          mockValidator = jasmine.createSpyObj('ValidationService', ['validate']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal', 'explorerUrl']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          mockXrplTransactionOrchestratorService = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
          mockTransactionOptionalFieldsService = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          mockDelegateTransactionBuilderService = jasmine.createSpyObj('DelegateTransactionBuilderService', ['buildDelegateTx']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for delegate transaction builder
          mockDelegateTransactionBuilderService.buildDelegateTx.and.returnValue(mockDelegateTx);

          TestBed.configureTestingModule({
               providers: [
                    DelegateTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: DelegateTransactionBuilderService, useValue: mockDelegateTransactionBuilderService },
                    { provide: UtilsService, useValue: mockUtilsService },
               ],
          });

          service = TestBed.inject(DelegateTransactionOrchestratorService);
     });

     describe('executeDelegateTx', () => {
          const baseAccount: any = {
               regularKeyAddress: '',
               regularKeySeed: '',
               multiSignAddress: '',
               multiSignSeeds: [],
          };

          const baseTxOptions: any = {
               isSimulateEnabled: false,
               useMultiSign: false,
               isRegularKeyAddress: false,
               ticketCountField: 5,
          };

          const baseConfig: DelegateTxConfig = {
               delegate: baseDelegate,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
          };

          beforeEach(() => {
               // Reset mocks before each test
               mockXrplTransactionOrchestratorService.executeTx.calls.reset();
               mockToastService.success.calls.reset();

               // Set default mock for executeTx
               mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                    success: true,
                    hash: 'txHash123',
                    mode: 'submit',
                    tx: mockDelegateTx,
                    response: {},
               });

               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('delegateCreate', () => {
               it('should successfully create a delegate', async () => {
                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockDelegateTransactionBuilderService.buildDelegateTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include tickets when fetching environment', async () => {
                    await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeTickets: true,
                    });
               });
          });

          describe('delegateClear', () => {
               it('should successfully clear a delegate', async () => {
                    const result = await service.executeDelegateTx('delegateClear', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockDelegateTransactionBuilderService.buildDelegateTx).toHaveBeenCalled();
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeDelegateTx('delegateCreate', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });

               it('should handle undefined wallet in environment', async () => {
                    const envWithoutWallet = { ...mockEnv, wallet: undefined };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(envWithoutWallet);

                    await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(mockDelegateTransactionBuilderService.buildDelegateTx).toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient XRP balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Unexpected error');
               });
          });

          // describe('Simulation Mode', () => {
          //      it('should handle simulation mode successfully', async () => {
          //           const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };

          //           mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
          //                success: true,
          //                hash: 'simHash',
          //                mode: 'simulate',
          //                tx: mockDelegateTx,
          //                response: {},
          //           });

          //           const result = await service.executeDelegateTx('delegateCreate', simConfig);

          //           expect(result.success).toBeTrue();
          //           // hash will be undefined because the service doesn't pass it correctly
          //           expect(result.hash).toBeUndefined();
          //           expect(mockToastService.success).toHaveBeenCalledWith('Simulated Setting Delegation', AppConstants.TOAST.SUCCESS, false, undefined, 'https://explorer.xrpl.org/tx/');
          //           expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
          //      });
          // });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
               });
          });

          describe('Signing Options', () => {
               it('should handle multi-sign signing options', async () => {
                    const multiSignConfig: any = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              useMultiSign: true,
                         },
                         account: {
                              ...baseAccount,
                              multiSignAddress: 'rMultiSignAddress',
                              multiSignSeeds: ['seed1', 'seed2'],
                         },
                    };

                    await service.executeDelegateTx('delegateCreate', multiSignConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.useMultiSign).toBeTrue();
                    expect(executeCall.args[0]?.signing?.multiSignAddress).toBe('rMultiSignAddress');
                    expect(executeCall.args[0]?.signing?.multiSignSeeds as any).toEqual(['seed1', 'seed2']);
               });

               it('should handle regular key signing options', async () => {
                    const regularKeyConfig: any = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              isRegularKeyAddress: true,
                         },
                         account: {
                              ...baseAccount,
                              regularKeyAddress: 'rRegularKeyAddress',
                              regularKeySeed: 'regularKeySeed',
                         },
                    };

                    await service.executeDelegateTx('delegateCreate', regularKeyConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.isRegularKeyAddress).toBeTrue();
                    expect(executeCall.args[0]?.signing?.regularKeyAddress).toBe('rRegularKeyAddress');
                    expect(executeCall.args[0]?.signing?.regularKeySeed).toBe('regularKeySeed');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeDelegateTx('delegateCreate', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const delegate = { ticketId: 'ticket123' };
               const currency = {};
               const hash = 'simHash';

               service.handleSimulationSuccess('delegateCreate', delegate, currency, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('delegateCreate', {}, {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
