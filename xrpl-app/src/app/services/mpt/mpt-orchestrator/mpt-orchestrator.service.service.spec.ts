import { TestBed } from '@angular/core/testing';
import { MptOrchestratorServiceService } from './mpt-orchestrator.service.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { MptUtilService } from '../mpt-util/mpt-util.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { MptTransactionBuilderService } from '../mpt-transaction-builder/mpt-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { MptTxConfig } from '../../../components/mpt/constants/mpt.types';
import { AppConstants } from '../../../core/app.constants';
import { XrplTxOptionsState } from '../../../components/shared/stores/xrpl-tx-options.store';
import { MptState } from '../mpt-store/mpt-store.service';
import * as xrpl from 'xrpl';

describe('MptOrchestratorServiceService', () => {
     let service: MptOrchestratorServiceService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockMptUtilService: jasmine.SpyObj<MptUtilService>;
     let mockMptTransactionBuilderService: jasmine.SpyObj<MptTransactionBuilderService>;
     let mockAccountConfiguratorStoreService: jasmine.SpyObj<typeof AccountConfiguratorStoreService>;
     let mockXrplTxOptionsStore: jasmine.SpyObj<typeof XrplTxOptionsStore>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
     };

     // Create specific mock transactions for each MPT transaction type
     const mockCreateMptTx: xrpl.MPTokenIssuanceCreate = {
          TransactionType: 'MPTokenIssuanceCreate',
          Account: 'rTestAddress1234567890',
          MaximumAmount: '1000',
          Fee: '12',
          LastLedgerSequence: 1000,
          AssetScale: 2,
     } as xrpl.MPTokenIssuanceCreate;

     const mockAuthorizeTx: xrpl.MPTokenAuthorize = {
          TransactionType: 'MPTokenAuthorize',
          Account: 'rTestAddress1234567890',
          MPTokenIssuanceID: 'issuance-1',
          Fee: '12',
          LastLedgerSequence: 1000,
     } as xrpl.MPTokenAuthorize;

     const mockLockTx: xrpl.MPTokenIssuanceSet = {
          TransactionType: 'MPTokenIssuanceSet',
          Account: 'rTestAddress1234567890',
          MPTokenIssuanceID: 'issuance-1',
          Fee: '12',
          LastLedgerSequence: 1000,
     } as xrpl.MPTokenIssuanceSet;

     const mockSendTx: xrpl.Payment = {
          TransactionType: 'Payment',
          Account: 'rTestAddress1234567890',
          Destination: 'rDest',
          Amount: { mpt_issuance_id: 'issuance-1', value: '500' },
          Fee: '12',
          LastLedgerSequence: 1000,
     } as xrpl.Payment;

     const mockClawbackTx: xrpl.Clawback = {
          TransactionType: 'Clawback',
          Account: 'rTestAddress1234567890',
          Holder: 'rHolder',
          Amount: { mpt_issuance_id: 'issuance-1', value: '500' },
          Fee: '12',
          LastLedgerSequence: 1000,
          Flags: 0,
     } as xrpl.Clawback;

     const mockDestroyTx: xrpl.MPTokenIssuanceDestroy = {
          TransactionType: 'MPTokenIssuanceDestroy',
          Account: 'rTestAddress1234567890',
          MPTokenIssuanceID: 'issuance-1',
          Fee: '12',
          LastLedgerSequence: 1000,
     } as xrpl.MPTokenIssuanceDestroy;

     const mockEnv: any = {
          client: { disconnect: jasmine.createSpy() },
          accountInfo: { Balance: '1000000' },
          fee: '12',
          ledgerInfo: { lastIndex: 1000 },
          accountObjects: { result: { account_objects: [] } },
          wallet: mockWallet,
     };

     beforeEach(() => {
          mockTxEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          mockValidator = jasmine.createSpyObj('ValidationService', ['validate']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal', 'explorerUrl']);
          mockMptUtilService = jasmine.createSpyObj('MptUtilService', ['someMethod']);
          mockMptTransactionBuilderService = jasmine.createSpyObj('MptTransactionBuilderService', ['buildCreateMptTx', 'buildMptAuthorizeTransaction', 'buildMptLockTransaction', 'buildMptSendTransaction', 'buildMptClawbackTransaction', 'buildMptDestroyTransaction']);
          mockAccountConfiguratorStoreService = jasmine.createSpyObj('AccountConfiguratorStoreService', ['someMethod']);
          mockXrplTxOptionsStore = jasmine.createSpyObj('XrplTxOptionsStore', ['someMethod']);
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
          mockTransactionOptionalFieldsService = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
          mockXrplTransactionOrchestratorService = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockCreateMptTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for each transaction builder
          mockMptTransactionBuilderService.buildCreateMptTx.and.returnValue(mockCreateMptTx);
          mockMptTransactionBuilderService.buildMptAuthorizeTransaction.and.returnValue(mockAuthorizeTx);
          mockMptTransactionBuilderService.buildMptLockTransaction.and.returnValue(mockLockTx);
          mockMptTransactionBuilderService.buildMptSendTransaction.and.returnValue(mockSendTx);
          mockMptTransactionBuilderService.buildMptClawbackTransaction.and.returnValue(mockClawbackTx);
          mockMptTransactionBuilderService.buildMptDestroyTransaction.and.returnValue(mockDestroyTx);

          TestBed.configureTestingModule({
               providers: [
                    MptOrchestratorServiceService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: MptUtilService, useValue: mockMptUtilService },
                    { provide: MptTransactionBuilderService, useValue: mockMptTransactionBuilderService },
                    { provide: AccountConfiguratorStoreService, useValue: mockAccountConfiguratorStoreService },
                    { provide: XrplTxOptionsStore, useValue: mockXrplTxOptionsStore },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
               ],
          });

          service = TestBed.inject(MptOrchestratorServiceService);
     });

     describe('executeMptTx', () => {
          const baseMpt: MptState = {
               tokenCount: 1000,
               assetScale: 2,
               metaData: 'test',
               mptIssuanceId: '',
               authAction: 'authorize',
               lockAction: 'lock',
               metadataError: '',
               canLock: false,
               isRequireAuth: false,
               canEscrow: false,
               canTrade: false,
               canTransfer: false,
               canClawback: false,
               totalFlagsValue: 0,
               totalFlagsHex: '0x0',
               assetScaleCache: new Map(),
               existingMpts: [],
               xls89Template: {},
          } as any;

          const baseAccount: any = {
               account: {},
               txOptions: {},
               accountInfo: {},
               configurationType: 'single',
               address: '',
               seed: '',
               classicAddress: '',
               regularKeyAddress: '',
               regularKeySeed: '',
               multiSignAddress: '',
               multiSignSeeds: [],
          };

          const baseTxOptions: Partial<XrplTxOptionsState> = {
               destinationTag: '',
               sourceTag: '',
               invoiceId: '',
               isMemoEnabled: false,
               memos: [],
               isRegularKeyAddress: false,
          };

          const baseConfig: MptTxConfig = {
               mpt: baseMpt,
               account: baseAccount,
               txOptions: baseTxOptions as XrplTxOptionsState,
               wallet: mockWallet,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('createMpt', () => {
               it('should successfully create an MPT', async () => {
                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockMptTransactionBuilderService.buildCreateMptTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeMptTx('createMpt', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });
          });

          describe('authorizeMpt', () => {
               it('should successfully authorize an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1' } as MptState };
                    const result = await service.executeMptTx('authorizeMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptAuthorizeTransaction).toHaveBeenCalled();
               });
          });

          describe('unauthorizeMpt', () => {
               it('should successfully unauthorize an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1' } as MptState };
                    const result = await service.executeMptTx('unauthorizeMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptAuthorizeTransaction).toHaveBeenCalled();
               });
          });

          describe('sendMpt', () => {
               it('should successfully send an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1', tokenCount: 500 } as MptState };
                    const result = await service.executeMptTx('sendMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptSendTransaction).toHaveBeenCalled();
               });
          });

          describe('lockMpt', () => {
               it('should successfully lock an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1', lockAction: 'lock' } as MptState };
                    const result = await service.executeMptTx('lockMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptLockTransaction).toHaveBeenCalled();
               });
          });

          describe('unlockMpt', () => {
               it('should successfully unlock an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1', lockAction: 'unlock' } as MptState };
                    const result = await service.executeMptTx('unlockMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptLockTransaction).toHaveBeenCalled();
               });
          });

          describe('clawbackMpt', () => {
               it('should successfully clawback an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1', tokenCount: 500 } as MptState };
                    const result = await service.executeMptTx('clawbackMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptClawbackTransaction).toHaveBeenCalled();
               });
          });

          describe('destroyMpt', () => {
               it('should successfully destroy an MPT', async () => {
                    const config = { ...baseConfig, mpt: { ...baseMpt, mptIssuanceId: 'issuance-1' } as MptState };
                    const result = await service.executeMptTx('destroyMpt', config);

                    expect(result.success).toBeTrue();
                    expect(mockMptTransactionBuilderService.buildMptDestroyTransaction).toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Unexpected error');
               });
          });

          describe('Simulation Mode', () => {
               it('should handle simulation mode successfully', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateMptTx,
                         response: {},
                    });

                    const result = await service.executeMptTx('createMpt', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for createMpt', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateMptTx,
                         response: {},
                    });

                    await service.executeMptTx('createMpt', baseConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith(jasmine.stringContaining('Simulated Creating MPT'), AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executeMptTx('createMpt', baseConfig);

                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeMptTx('createMpt', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeMptTx('createMpt', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const mpt = { tokenCount: 1000 };
               const hash = 'simHash';

               service.handleSimulationSuccess('createMpt', mpt, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });
     });
});
