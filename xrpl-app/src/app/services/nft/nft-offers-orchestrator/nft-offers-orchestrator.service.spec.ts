import { TestBed } from '@angular/core/testing';
import { NftOffersOrchestratorService } from './nft-offers-orchestrator.service';
import { ChecksTransactionBuilderService } from '../../checks/checks-transaction-builder/checks-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { NftTransactionBuilderService } from '../nft-transaction-builder/nft-transaction-builder.service';
import { NftOfferTxConfig } from '../../../components/nft-offers/constants/nft-offers.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('NftOffersOrchestratorService', () => {
     let service: NftOffersOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockChecksTransactionBuilderService: jasmine.SpyObj<ChecksTransactionBuilderService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let mockNftTransactionBuilderService: jasmine.SpyObj<NftTransactionBuilderService>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     };

     // Mock NFT State
     const baseNft: any = {
          nftId: 'nft123',
          nftOfferId: 'offer123',
     };

     // Mock Currency State
     const baseCurrency: any = {
          currencyCode: 'XRP',
          currencyIssuer: '',
     };

     // Mock NFT transactions
     const mockBuyNftTx: any = {
          TransactionType: 'NFTokenAcceptOffer',
          Account: 'rTestAddress1234567890',
          NFTokenSellOffer: 'offer123',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockSellNftTx: any = {
          TransactionType: 'NFTokenCreateOffer',
          Account: 'rTestAddress1234567890',
          NFTokenID: 'nft123',
          Amount: '1000000',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockBuyNftOfferTx: any = {
          TransactionType: 'NFTokenAcceptOffer',
          Account: 'rTestAddress1234567890',
          NFTokenBuyOffer: 'offer456',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockSellNftOfferTx: any = {
          TransactionType: 'NFTokenCreateOffer',
          Account: 'rTestAddress1234567890',
          NFTokenID: 'nft123',
          Amount: '2000000',
          Fee: '12',
          LastLedgerSequence: 1000,
          Flags: 1,
     };

     const mockCancelNftOfferTx: any = {
          TransactionType: 'NFTokenCancelOffer',
          Account: 'rTestAddress1234567890',
          NFTokenOffers: ['offer789'],
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
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal', 'explorerUrl']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          mockChecksTransactionBuilderService = jasmine.createSpyObj('ChecksTransactionBuilderService', ['someMethod']);
          mockTransactionOptionalFieldsService = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
          mockXrplTransactionOrchestratorService = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
          mockNftTransactionBuilderService = jasmine.createSpyObj('NftTransactionBuilderService', ['buildBuyNftDataTx', 'buildSellNftDataTx', 'buildBuyNftOfferDataTx', 'buildSellNftOfferDataTx', 'buildCancelNftOfferDataTx']);

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockBuyNftTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for NFT transaction builders
          mockNftTransactionBuilderService.buildBuyNftDataTx.and.returnValue(mockBuyNftTx);
          mockNftTransactionBuilderService.buildSellNftDataTx.and.returnValue(mockSellNftTx);
          mockNftTransactionBuilderService.buildBuyNftOfferDataTx.and.returnValue(mockBuyNftOfferTx);
          mockNftTransactionBuilderService.buildSellNftOfferDataTx.and.returnValue(mockSellNftOfferTx);
          mockNftTransactionBuilderService.buildCancelNftOfferDataTx.and.returnValue(mockCancelNftOfferTx);

          TestBed.configureTestingModule({
               providers: [
                    NftOffersOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: ChecksTransactionBuilderService, useValue: mockChecksTransactionBuilderService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
                    { provide: NftTransactionBuilderService, useValue: mockNftTransactionBuilderService },
               ],
          });

          service = TestBed.inject(NftOffersOrchestratorService);
     });

     describe('executeNftOfferTx', () => {
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

          const baseConfig: NftOfferTxConfig = {
               nft: baseNft,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
               currency: baseCurrency,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('buyNft', () => {
               it('should successfully buy an NFT', async () => {
                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockNftTransactionBuilderService.buildBuyNftDataTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include NFT sell offers when fetching environment', async () => {
                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeNftSellOffers: true,
                         includeNftBuyOffers: false,
                    });
               });
          });

          describe('sellNft', () => {
               it('should successfully sell an NFT', async () => {
                    const result = await service.executeNftOfferTx('sellNft', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildSellNftDataTx).toHaveBeenCalled();
               });

               it('should include NFT buy offers when fetching environment', async () => {
                    await service.executeNftOfferTx('sellNft', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeNftSellOffers: false,
                         includeNftBuyOffers: true,
                    });
               });
          });

          describe('buyNftOffer', () => {
               it('should successfully buy an NFT offer', async () => {
                    const result = await service.executeNftOfferTx('buyNftOffer', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildBuyNftOfferDataTx).toHaveBeenCalled();
               });
          });

          describe('sellNftOffer', () => {
               it('should successfully sell an NFT offer', async () => {
                    const result = await service.executeNftOfferTx('sellNftOffer', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildSellNftOfferDataTx).toHaveBeenCalled();
               });
          });

          describe('cancelNftOffer', () => {
               it('should successfully cancel an NFT offer', async () => {
                    const result = await service.executeNftOfferTx('cancelNftOffer', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildCancelNftOfferDataTx).toHaveBeenCalled();
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeNftOfferTx('buyNft', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });

               it('should handle undefined wallet in environment', async () => {
                    const envWithoutWallet = { ...mockEnv, wallet: undefined };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(envWithoutWallet);

                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockNftTransactionBuilderService.buildBuyNftDataTx).toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data - accountInfo', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle missing required network data - fee', async () => {
                    const invalidEnv = { ...mockEnv, fee: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle missing required network data - ledgerInfo', async () => {
                    const invalidEnv = { ...mockEnv, ledgerInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeNftOfferTx('buyNft', baseConfig);

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
                         tx: mockBuyNftTx,
                         response: {},
                    });

                    const result = await service.executeNftOfferTx('buyNft', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for buyNft', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockBuyNftTx,
                         response: {},
                    });

                    await service.executeNftOfferTx('buyNft', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Buying NFT of nft123', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
               });

               it('should pass the correct parameters to optional fields service', async () => {
                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalledWith(mockEnv.client, mockBuyNftTx, mockWallet, baseNft, 'buyNft', baseTxOptions);
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

                    await service.executeNftOfferTx('buyNft', multiSignConfig);

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

                    await service.executeNftOfferTx('buyNft', regularKeyConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.isRegularKeyAddress).toBeTrue();
                    expect(executeCall.args[0]?.signing?.regularKeyAddress).toBe('rRegularKeyAddress');
                    expect(executeCall.args[0]?.signing?.regularKeySeed).toBe('regularKeySeed');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });

               it('should reset UI state in finally block even after error', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    await service.executeNftOfferTx('buyNft', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const nft = { nftId: 'nft123' };
               const hash = 'simHash';

               service.handleSimulationSuccess('buyNft', nft, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('buyNft', {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
