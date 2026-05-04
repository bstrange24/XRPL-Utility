import { TestBed } from '@angular/core/testing';
import { NftTransactionOrchestrator } from './nft-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { ChecksTransactionBuilderService } from '../../checks/checks-transaction-builder/checks-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { NftTransactionBuilderService } from '../nft-transaction-builder/nft-transaction-builder.service';
import { NftCreateTxConfig } from '../../../components/nft-create/constants/nft-create.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { CurrencyState } from '../../currency/constants/currency.types';
import { NFtState } from '../nft-store/nft-store.service';
import * as xrpl from 'xrpl';

describe('NftTransactionOrchestrator', () => {
     let service: NftTransactionOrchestrator;
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

     // Complete Mock NFtState
     const baseNft: NFtState = {
          nftId: 'nft123',
          nftIndex: '',
          nftOfferId: '',
          selectedNftOfferIndex: '',
          destination: '',
          amount: '1000000',
          taxon: '12345',
          nftCreator: '',
          nftFlags: 0,
          decodedNftFlags: [],
          nftIdSearchQuery: '',
          transferFee: 0,
          outstandingNfts: '',
          expiration: '',
          outstandingNftsCollapsed: false,
          existingNftsCollapsed: false,
          existingSellOffersCollapsed: false,
          minterAddress: '',
          issuerAddress: '',
          enableExpirationDate: false,
          enableSellOnNftCreation: false,
          initialURI: 'https://example.com/nft.json',
          nftCountField: '',
          isNftOwner: false,
          isCollapsed: false,
          nftOwnerAddress: '',
          nfTokenMinterAddress: '',
          nfTokenIssuerAddress: '',
          existingNfts: [],
          existingSellOffers: [],
          existingBuyOffers: [],
     };

     // Complete Mock CurrencyState for XRP
     const xrpCurrency: CurrencyState = {
          currencyCode: 'XRP',
          currencyIssuer: '',
          lastCurrency: '',
          lastIssuer: '',
          userAddedissuerFields: '',
          newCurrency: '',
          newIssuer: '',
          issuerToRemove: '',
          currency: 'XRP',
          issuer: '',
          amount: 0,
          balance: '',
          isIssuer: false,
          destination: '',
     };

     // Complete Mock CurrencyState for Token
     const tokenCurrency: CurrencyState = {
          ...xrpCurrency,
          currencyCode: 'USD',
          currencyIssuer: 'rIssuerAddress',
          currency: 'USD',
     };

     // Mock NFT transactions
     const mockCreateNftTx: any = {
          TransactionType: 'NFTokenMint',
          Account: 'rTestAddress1234567890',
          URI: 'https://example.com/nft.json',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockBurnNftTx: any = {
          TransactionType: 'NFTokenBurn',
          Account: 'rTestAddress1234567890',
          NFTokenID: 'nft123',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockUpdateNftMetadataTx: any = {
          TransactionType: 'NFTokenMint',
          Account: 'rTestAddress1234567890',
          NFTokenID: 'nft123',
          URI: 'https://example.com/nft-updated.json',
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
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance', 'checkTokenBalance']);
          mockXrplTransactionOrchestratorService = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
          mockNftTransactionBuilderService = jasmine.createSpyObj('NftTransactionBuilderService', ['buildCreateNftTx', 'buildBurnNftTx', 'buildUpdateNftMetaDataTx']);

          // Setup default mocks
          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({ ...mockEnv });
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockSufficentAccountBalanceService.checkTokenBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockCreateNftTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for NFT transaction builders
          mockNftTransactionBuilderService.buildCreateNftTx.and.returnValue(mockCreateNftTx);
          mockNftTransactionBuilderService.buildBurnNftTx.and.returnValue(mockBurnNftTx);
          mockNftTransactionBuilderService.buildUpdateNftMetaDataTx.and.returnValue(mockUpdateNftMetadataTx);

          TestBed.configureTestingModule({
               providers: [
                    NftTransactionOrchestrator,
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

          service = TestBed.inject(NftTransactionOrchestrator);
     });

     describe('executeCreateNftTx', () => {
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

          const baseConfig: NftCreateTxConfig = {
               nft: baseNft,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
               currency: xrpCurrency,
          };

          beforeEach(() => {
               // Reset all mocks before each test
               mockTxEnvironmentService.prepareTxEnvironment.calls.reset();
               mockValidator.validate.calls.reset();
               mockSufficentAccountBalanceService.checkXrpBalance.calls.reset();
               mockSufficentAccountBalanceService.checkTokenBalance.calls.reset();
               mockXrplTransactionOrchestratorService.executeTx.calls.reset();
               mockNftTransactionBuilderService.buildCreateNftTx.calls.reset();
               mockTransactionOptionalFieldsService.setTxOptionalFields.calls.reset();

               // Re-setup default resolved values
               mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo({ ...mockEnv });
               mockValidator.validate.and.resolveTo([]);
               mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
               mockSufficentAccountBalanceService.checkTokenBalance.and.resolveTo({ success: true, error: '' });
               mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                    success: true,
                    hash: 'txHash123',
                    mode: 'submit',
                    tx: mockCreateNftTx,
                    response: {},
               });
               mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });

               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('createNft', () => {
               it('should successfully create an NFT', async () => {
                    const result = await service.executeCreateNftTx('createNft', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockNftTransactionBuilderService.buildCreateNftTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include required environment flags when fetching', async () => {
                    await service.executeCreateNftTx('createNft', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    });
               });

               it('should check XRP balance for XRP currency', async () => {
                    await service.executeCreateNftTx('createNft', baseConfig);

                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkTokenBalance).not.toHaveBeenCalled();
               });

               it('should check token balance for non-XRP currency', async () => {
                    const tokenConfig = {
                         ...baseConfig,
                         currency: tokenCurrency,
                    };

                    await service.executeCreateNftTx('createNft', tokenConfig);

                    expect(mockSufficentAccountBalanceService.checkTokenBalance).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).not.toHaveBeenCalled();
               });
          });

          describe('burnNft', () => {
               it('should successfully burn an NFT', async () => {
                    const result = await service.executeCreateNftTx('burnNft', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildBurnNftTx).toHaveBeenCalled();
               });
          });

          describe('updateNFTMetadata', () => {
               it('should successfully update NFT metadata', async () => {
                    const result = await service.executeCreateNftTx('updateNFTMetadata', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(mockNftTransactionBuilderService.buildUpdateNftMetaDataTx).toHaveBeenCalled();
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeCreateNftTx('createNft', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });

               it('should handle undefined wallet in environment', async () => {
                    const envWithoutWallet = { ...mockEnv, wallet: undefined };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(envWithoutWallet);

                    await service.executeCreateNftTx('createNft', baseConfig);

                    expect(mockNftTransactionBuilderService.buildCreateNftTx).toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeCreateNftTx('createNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeCreateNftTx('createNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient XRP balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeCreateNftTx('createNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle insufficient token balance', async () => {
                    const tokenConfig = {
                         ...baseConfig,
                         currency: tokenCurrency,
                    };
                    mockSufficentAccountBalanceService.checkTokenBalance.and.resolveTo({ success: false, error: 'Insufficient token balance' });

                    const result = await service.executeCreateNftTx('createNft', tokenConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient token balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeCreateNftTx('createNft', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeCreateNftTx('createNft', baseConfig);

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
                         tx: mockCreateNftTx,
                         response: {},
                    });

                    const result = await service.executeCreateNftTx('createNft', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for createNft', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateNftTx,
                         response: {},
                    });

                    await service.executeCreateNftTx('createNft', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Sending NFT of 1000000', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Optional Fields', () => {
               it('should apply optional fields to transaction', async () => {
                    await service.executeCreateNftTx('createNft', baseConfig);

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

                    await service.executeCreateNftTx('createNft', multiSignConfig);

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

                    await service.executeCreateNftTx('createNft', regularKeyConfig);

                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    const executeCall = mockXrplTransactionOrchestratorService.executeTx.calls.mostRecent();
                    expect(executeCall.args[0]?.signing?.isRegularKeyAddress).toBeTrue();
                    expect(executeCall.args[0]?.signing?.regularKeyAddress).toBe('rRegularKeyAddress');
                    expect(executeCall.args[0]?.signing?.regularKeySeed).toBe('regularKeySeed');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeCreateNftTx('createNft', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeCreateNftTx('createNft', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const nft = { amount: '1000000' };
               const hash = 'simHash';

               service.handleSimulationSuccess('createNft', nft, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('createNft', {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
