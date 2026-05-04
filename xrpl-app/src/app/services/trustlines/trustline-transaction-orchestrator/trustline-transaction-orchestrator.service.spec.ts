import { TestBed } from '@angular/core/testing';
import { TrustlineTransactionOrchestratorService } from './trustline-transaction-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TrustlineTransactionBuilderService } from '../trustline-transaction-builder/trustline-transaction-builder.service';
import { CredentialUtilService } from '../../credentials/credential-util/credential-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { TrustlineTxConfig, TrustlineState } from '../../../components/trustlines/constants/trustline.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('TrustlineTransactionOrchestratorService', () => {
     let service: TrustlineTransactionOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockTrustlineTransactionBuilderService: jasmine.SpyObj<TrustlineTransactionBuilderService>;
     let mockCredentialUtilService: jasmine.SpyObj<CredentialUtilService>;
     let mockXrplDateService: jasmine.SpyObj<XrplDateService>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
     };

     // Complete Mock TrustlineState
     const baseTrustline: TrustlineState = {
          isLoaded: false,
          isLoading: false,
          error: null,
          trustlineAlreadyExist: false,
          removeTrustlineAvailable: false,
          removeTrustlineMessage: [],
          showTrustlineOptions: false,
          outstandingIOUCollapsed: false,
          existingIOUs: null,
          trustlineLimitField: 0,
          tokenToRemove: '',
          trustlineFlags: 0,
          missingTrustlineInfo: {
               currencyCode: '',
               issuer: '',
          },
     };

     // Mock Currency State
     const baseCurrency: any = {
          currency: 'USD',
          issuer: 'rIssuerAddress',
          amount: '1000',
          destination: 'rDestination',
     };

     // Mock Trustline transactions
     const mockSetTrustlineTx: any = {
          TransactionType: 'TrustSet',
          Account: 'rTestAddress1234567890',
          LimitAmount: {
               currency: 'USD',
               issuer: 'rIssuerAddress',
               value: '1000',
          },
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockRemoveTrustlineTx: any = {
          TransactionType: 'TrustSet',
          Account: 'rTestAddress1234567890',
          LimitAmount: {
               currency: 'USD',
               issuer: 'rIssuerAddress',
               value: '0',
          },
          Fee: '12',
          LastLedgerSequence: 1000,
          Flags: 131072,
     };

     const mockIssueCurrencyTx: any = {
          TransactionType: 'Payment',
          Account: 'rTestAddress1234567890',
          Destination: 'rDestination',
          Amount: {
               currency: 'USD',
               issuer: 'rTestAddress1234567890',
               value: '1000',
          },
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockClawbackTx: any = {
          TransactionType: 'Clawback',
          Account: 'rTestAddress1234567890',
          Holder: 'rDestination',
          Amount: {
               currency: 'USD',
               issuer: 'rTestAddress1234567890',
               value: '1000',
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
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance', 'checkTokenBalance']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          mockTrustlineTransactionBuilderService = jasmine.createSpyObj('TrustlineTransactionBuilderService', ['buildTrustSetTx', 'buildTrustSetRemoveTx', 'buildIssueCurrencyTx', 'buildClawbackTx']);
          mockCredentialUtilService = jasmine.createSpyObj('CredentialUtilService', ['someMethod']);
          mockXrplDateService = jasmine.createSpyObj('XrplDateService', ['someMethod']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockSufficentAccountBalanceService.checkTokenBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockSetTrustlineTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for trustline transaction builders
          mockTrustlineTransactionBuilderService.buildTrustSetTx.and.returnValue(mockSetTrustlineTx);
          mockTrustlineTransactionBuilderService.buildTrustSetRemoveTx.and.returnValue(mockRemoveTrustlineTx);
          mockTrustlineTransactionBuilderService.buildIssueCurrencyTx.and.returnValue(mockIssueCurrencyTx);
          mockTrustlineTransactionBuilderService.buildClawbackTx.and.returnValue(mockClawbackTx);

          TestBed.configureTestingModule({
               providers: [
                    TrustlineTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: TrustlineTransactionBuilderService, useValue: mockTrustlineTransactionBuilderService },
                    { provide: CredentialUtilService, useValue: mockCredentialUtilService },
                    { provide: XrplDateService, useValue: mockXrplDateService },
               ],
          });

          service = TestBed.inject(TrustlineTransactionOrchestratorService);
     });

     describe('executeTrustlineTx', () => {
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
          };

          const baseConfig: TrustlineTxConfig = {
               trustline: baseTrustline,
               currency: baseCurrency,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('setTrustline', () => {
               it('should successfully set a trustline', async () => {
                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockTrustlineTransactionBuilderService.buildTrustSetTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include trustlines when fetching environment', async () => {
                    await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    });
               });
          });

          describe('removeTrustline', () => {
               it('should successfully remove a trustline', async () => {
                    const result = await service.executeTrustlineTx('removeTrustline', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockTrustlineTransactionBuilderService.buildTrustSetRemoveTx).toHaveBeenCalled();
               });
          });

          describe('issueCurrency', () => {
               it('should successfully issue currency', async () => {
                    const result = await service.executeTrustlineTx('issueCurrency', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockTrustlineTransactionBuilderService.buildIssueCurrencyTx).toHaveBeenCalled();
               });
          });

          describe('clawbackTokens', () => {
               it('should successfully clawback tokens', async () => {
                    const result = await service.executeTrustlineTx('clawbackTokens', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockTrustlineTransactionBuilderService.buildClawbackTx).toHaveBeenCalled();
               });
          });

          describe('addNewIssuers', () => {
               it('should throw error when attempting to execute addNewIssuers', async () => {
                    const result = await service.executeTrustlineTx('addNewIssuers', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('addNewIssuers has no transaction');
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeTrustlineTx('setTrustline', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });

               it('should handle undefined wallet in environment', async () => {
                    const envWithoutWallet = { ...mockEnv, wallet: undefined };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(envWithoutWallet);

                    await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(mockTrustlineTransactionBuilderService.buildTrustSetTx).toHaveBeenCalled();
               });
          });

          describe('Balance Checks', () => {
               it('should check XRP balance for XRP currency', async () => {
                    const xrpConfig = {
                         ...baseConfig,
                         currency: { ...baseCurrency, currency: 'XRP', amount: '100' },
                    };

                    await service.executeTrustlineTx('setTrustline', xrpConfig);

                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkTokenBalance).not.toHaveBeenCalled();
               });

               it('should check token balance for non-XRP currency', async () => {
                    await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(mockSufficentAccountBalanceService.checkTokenBalance).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).not.toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient XRP balance', async () => {
                    const xrpConfig = {
                         ...baseConfig,
                         currency: { ...baseCurrency, currency: 'XRP', amount: '100' },
                    };
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeTrustlineTx('setTrustline', xrpConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle insufficient token balance', async () => {
                    mockSufficentAccountBalanceService.checkTokenBalance.and.resolveTo({ success: false, error: 'Insufficient token balance' });

                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient token balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Unexpected error');
               });
          });

          describe('Simulation Mode', () => {
               it('should handle simulation mode successfully', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockSetTrustlineTx,
                         response: {},
                    });

                    const result = await service.executeTrustlineTx('setTrustline', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for setTrustline', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockSetTrustlineTx,
                         response: {},
                    });

                    await service.executeTrustlineTx('setTrustline', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Successfully simulated setting Trustline.', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executeTrustlineTx('setTrustline', baseConfig);

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

                    await service.executeTrustlineTx('setTrustline', multiSignConfig);

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

                    await service.executeTrustlineTx('setTrustline', regularKeyConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.isRegularKeyAddress).toBeTrue();
                    expect(executeCall.args[0]?.signing?.regularKeyAddress).toBe('rRegularKeyAddress');
                    expect(executeCall.args[0]?.signing?.regularKeySeed).toBe('regularKeySeed');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeTrustlineTx('setTrustline', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const currency = { currency: 'USD', amount: '1000' };
               const hash = 'simHash';

               service.handleSimulationSuccess('setTrustline', currency, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('setTrustline', {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
