import { TestBed } from '@angular/core/testing';
import { PermissionedDomainOrchestratorService } from './permissioned-domain-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { PermissionedDomainTransactionBuilderService } from '../permissioned-domain-transaction-builder/permissioned-domain-transaction-builder.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { PermissionDomainConfig } from '../../../components/permissioned-domain/constants/permissioned-domain.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('PermissionedDomainOrchestratorService', () => {
     let service: PermissionedDomainOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockPermissionedDomainTransactionBuilderService: jasmine.SpyObj<PermissionedDomainTransactionBuilderService>;
     let mockPermissionedDomainStoreService: jasmine.SpyObj<typeof PermissionedDomainStoreService>;
     let mockPermissionedDomainUtilService: jasmine.SpyObj<PermissionedDomainUtilService>;
     let mockXrplTxOptionsStore: jasmine.SpyObj<typeof XrplTxOptionsStore>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     };

     // Mock Permission Domain State
     const basePermissionedDomain: any = {
          setAcceptedCredentials: [
               {
                    CredentialType: 'TestCredential',
                    Issuer: 'rIssuerAddress',
               },
          ],
          selectedDomainId: 'domain123',
     };

     // Mock Permission Domain transactions
     const mockSetPermissionDomainTx: any = {
          TransactionType: 'PermissionedDomainSet',
          Account: 'rTestAddress1234567890',
          SetAcceptedCredentials: [
               {
                    CredentialType: 'TestCredential',
                    Issuer: 'rIssuerAddress',
               },
          ],
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockDeletePermissionDomainTx: any = {
          TransactionType: 'PermissionedDomainDelete',
          Account: 'rTestAddress1234567890',
          DomainID: 'domain123',
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
          mockPermissionedDomainTransactionBuilderService = jasmine.createSpyObj('PermissionedDomainTransactionBuilderService', ['buildSetPermissionedDomainTransaction', 'buildDeletePermissionedDomainTransaction']);
          mockPermissionedDomainStoreService = jasmine.createSpyObj('PermissionedDomainStoreService', ['someMethod']);
          mockPermissionedDomainUtilService = jasmine.createSpyObj('PermissionedDomainUtilService', ['someMethod']);
          mockXrplTxOptionsStore = jasmine.createSpyObj('XrplTxOptionsStore', ['someMethod']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockSetPermissionDomainTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for permission domain transaction builders
          mockPermissionedDomainTransactionBuilderService.buildSetPermissionedDomainTransaction.and.returnValue(mockSetPermissionDomainTx);
          mockPermissionedDomainTransactionBuilderService.buildDeletePermissionedDomainTransaction.and.returnValue(mockDeletePermissionDomainTx);

          TestBed.configureTestingModule({
               providers: [
                    PermissionedDomainOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: PermissionedDomainTransactionBuilderService, useValue: mockPermissionedDomainTransactionBuilderService },
                    { provide: PermissionedDomainStoreService, useValue: mockPermissionedDomainStoreService },
                    { provide: PermissionedDomainUtilService, useValue: mockPermissionedDomainUtilService },
                    { provide: XrplTxOptionsStore, useValue: mockXrplTxOptionsStore },
               ],
          });

          service = TestBed.inject(PermissionedDomainOrchestratorService);
     });

     describe('executePermissionDomainTx', () => {
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

          const baseConfig: PermissionDomainConfig = {
               permissionedDomain: basePermissionedDomain,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('setPermissionedDomain', () => {
               it('should successfully set a permissioned domain', async () => {
                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockPermissionedDomainTransactionBuilderService.buildSetPermissionedDomainTransaction).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include required environment flags when fetching', async () => {
                    await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    });
               });
          });

          describe('deletePermissionedDomain', () => {
               it('should successfully delete a permissioned domain', async () => {
                    const result = await service.executePermissionDomainTx('deletePermissionedDomain', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockPermissionedDomainTransactionBuilderService.buildDeletePermissionedDomainTransaction).toHaveBeenCalled();
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executePermissionDomainTx('setPermissionedDomain', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

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
                         tx: mockSetPermissionDomainTx,
                         response: {},
                    });

                    const result = await service.executePermissionDomainTx('setPermissionedDomain', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for setPermissionedDomain', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockSetPermissionDomainTx,
                         response: {},
                    });

                    await service.executePermissionDomainTx('setPermissionedDomain', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Setting Permission Domain', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

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

                    await service.executePermissionDomainTx('setPermissionedDomain', multiSignConfig);

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

                    await service.executePermissionDomainTx('setPermissionedDomain', regularKeyConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.isRegularKeyAddress).toBeTrue();
                    expect(executeCall.args[0]?.signing?.regularKeyAddress).toBe('rRegularKeyAddress');
                    expect(executeCall.args[0]?.signing?.regularKeySeed).toBe('regularKeySeed');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executePermissionDomainTx('setPermissionedDomain', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const permissionedDomain = { setAcceptedCredentials: [] };
               const hash = 'simHash';

               service.handleSimulationSuccess('setPermissionedDomain', permissionedDomain, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('setPermissionedDomain', {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
