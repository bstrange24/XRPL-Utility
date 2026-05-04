import { TestBed } from '@angular/core/testing';
import { PaymentChannelOrchestratorService } from './payment-channel-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { PaymentChannelTransactionBuilderService } from '../payment-channel-transaction-builder/payment-channel-transaction-builder.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import { PaymentChannelTxConfig } from '../../../components/payment-channel/constants/payment-channel.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('PaymentChannelOrchestratorService', () => {
     let service: PaymentChannelOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockPaymentChannelTransactionBuilderService: jasmine.SpyObj<PaymentChannelTransactionBuilderService>;
     let mockPaymentChannelUtilService: jasmine.SpyObj<PaymentChannelUtilService>;

     const mockWallet: Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
     } as any;

     // Mock Payment Channel State
     const basePaymentChannel: any = {
          amount: '1000000',
          destination: 'rDestination123',
          settleDelay: 86400,
          channelIDField: 'channel123',
          channelClaimSignatureField: 'signature123',
     };

     // Mock Payment Channel transactions
     const mockCreateChannelTx: any = {
          TransactionType: 'PaymentChannelCreate',
          Account: 'rTestAddress1234567890',
          Destination: 'rDestination123',
          Amount: '1000000',
          SettleDelay: 86400,
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockFundChannelTx: any = {
          TransactionType: 'PaymentChannelFund',
          Account: 'rTestAddress1234567890',
          ChannelID: 'channel123',
          Amount: '500000',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockClaimChannelTx: any = {
          TransactionType: 'PaymentChannelClaim',
          Account: 'rTestAddress1234567890',
          ChannelID: 'channel123',
          Amount: '500000',
          Signature: 'signature123',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockRenewChannelTx: any = {
          TransactionType: 'PaymentChannelClaim',
          Account: 'rTestAddress1234567890',
          ChannelID: 'channel123',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockCloseChannelTx: any = {
          TransactionType: 'PaymentChannelClaim',
          Account: 'rTestAddress1234567890',
          ChannelID: 'channel123',
          Flags: 1,
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
          mockPaymentChannelTransactionBuilderService = jasmine.createSpyObj('PaymentChannelTransactionBuilderService', ['buildCreatePaymentChannelTx', 'buildFundPaymentChannelTx', 'buildClaimPaymentChannelTx', 'buildRenewPaymentChannelTx', 'buildClosePaymentChannelTx']);
          mockPaymentChannelUtilService = jasmine.createSpyObj('PaymentChannelUtilService', ['someMethod']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockCreateChannelTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for payment channel transaction builders
          mockPaymentChannelTransactionBuilderService.buildCreatePaymentChannelTx.and.returnValue(mockCreateChannelTx);
          mockPaymentChannelTransactionBuilderService.buildFundPaymentChannelTx.and.returnValue(mockFundChannelTx);
          mockPaymentChannelTransactionBuilderService.buildClaimPaymentChannelTx.and.returnValue(mockClaimChannelTx);
          mockPaymentChannelTransactionBuilderService.buildRenewPaymentChannelTx.and.returnValue(mockRenewChannelTx);
          mockPaymentChannelTransactionBuilderService.buildClosePaymentChannelTx.and.returnValue(mockCloseChannelTx);

          TestBed.configureTestingModule({
               providers: [
                    PaymentChannelOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: PaymentChannelTransactionBuilderService, useValue: mockPaymentChannelTransactionBuilderService },
                    { provide: PaymentChannelUtilService, useValue: mockPaymentChannelUtilService },
               ],
          });

          service = TestBed.inject(PaymentChannelOrchestratorService);
     });

     describe('executePaymentChannelTx', () => {
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

          const baseConfig: PaymentChannelTxConfig = {
               paymentChannel: basePaymentChannel,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('createPaymentChannel', () => {
               it('should successfully create a payment channel', async () => {
                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockPaymentChannelTransactionBuilderService.buildCreatePaymentChannelTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include payment channel objects when fetching environment', async () => {
                    await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includePaymentChannelObjects: true,
                    });
               });
          });

          describe('fundPaymentChannel', () => {
               it('should successfully fund a payment channel', async () => {
                    const result = await service.executePaymentChannelTx('fundPaymentChannel', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockPaymentChannelTransactionBuilderService.buildFundPaymentChannelTx).toHaveBeenCalled();
               });

               it('should use the correct validation inputs', async () => {
                    await service.executePaymentChannelTx('fundPaymentChannel', baseConfig);

                    expect(mockValidator.validate).toHaveBeenCalled();
               });
          });

          describe('claimPaymentChannel', () => {
               it('should successfully claim a payment channel', async () => {
                    const result = await service.executePaymentChannelTx('claimPaymentChannel', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockPaymentChannelTransactionBuilderService.buildClaimPaymentChannelTx).toHaveBeenCalled();
               });
          });

          describe('renewPaymentChannel', () => {
               it('should successfully renew a payment channel', async () => {
                    const result = await service.executePaymentChannelTx('renewPaymentChannel', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockPaymentChannelTransactionBuilderService.buildRenewPaymentChannelTx).toHaveBeenCalled();
               });
          });

          describe('closePaymentChannel', () => {
               it('should successfully close a payment channel', async () => {
                    const result = await service.executePaymentChannelTx('closePaymentChannel', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockPaymentChannelTransactionBuilderService.buildClosePaymentChannelTx).toHaveBeenCalled();
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executePaymentChannelTx('createPaymentChannel', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

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
                         tx: mockCreateChannelTx,
                         response: {},
                    });

                    const result = await service.executePaymentChannelTx('createPaymentChannel', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for createPaymentChannel', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateChannelTx,
                         response: {},
                    });

                    await service.executePaymentChannelTx('createPaymentChannel', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Creating Payment Channel', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });

               it('should show correct simulation toast message for fundPaymentChannel', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockFundChannelTx,
                         response: {},
                    });

                    await service.executePaymentChannelTx('fundPaymentChannel', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Funding Payment Channel', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executePaymentChannelTx('createPaymentChannel', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const paymentChannel = { amount: '1000000' };
               const hash = 'simHash';

               service.handleSimulationSuccess('createPaymentChannel', paymentChannel, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });
     });
});
