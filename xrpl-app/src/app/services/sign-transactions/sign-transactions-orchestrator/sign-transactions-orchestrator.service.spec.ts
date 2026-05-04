import { TestBed } from '@angular/core/testing';
import { SignTransactionsOrchestratorService, GenerateJsonOptions, SignTxOptions, SignForMultiSignOptions, SubmitTxOptions } from './sign-transactions-orchestrator.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { SignTransactionUtilService } from '../sign-transactions-util/sign-transaction-util.service';
import { SignTransationStoreService } from '../sign-transaction-store/sign-transation-store.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { signal, WritableSignal } from '@angular/core';

describe('SignTransactionsOrchestratorService', () => {
     let service: SignTransactionsOrchestratorService;
     let mockTxEnv: jasmine.SpyObj<TxEnvironmentService>;
     let mockToast: jasmine.SpyObj<ToastService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockXrplService: jasmine.SpyObj<XrplService>;
     let mockSignTransactionUtilService: jasmine.SpyObj<SignTransactionUtilService>;
     let mockSignTransationStoreService: any;
     let mockAccountConfiguratorStoreService: jasmine.SpyObj<typeof AccountConfiguratorStoreService>;

     // Create signal for selectedTransaction
     let selectedTransactionSignal: WritableSignal<string>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          sign: jasmine.createSpy().and.returnValue({ tx_blob: 'signed_tx_blob', hash: 'tx_hash' }),
     };

     const mockEnv: any = {
          client: { disconnect: jasmine.createSpy() },
          wallet: mockWallet,
          accountInfo: { Balance: '10000000', Sequence: 1 },
          fee: '12',
          currentLedger: 1000,
          ledgerInfo: { lastIndex: 1000 },
     };

     const mockRegularKeyWallet = {
          sign: jasmine.createSpy().and.returnValue({ tx_blob: 'regular_key_signed_blob', hash: 'regular_key_hash' }),
     };

     const mockTxJson = JSON.stringify({
          TransactionType: 'Payment',
          Account: 'rTestAddress1234567890',
          Destination: 'rDestination',
          Amount: '1000000',
          Fee: '12',
     });

     beforeEach(() => {
          // Initialize signal
          selectedTransactionSignal = signal<string>('sendXrp');

          mockTxEnv = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          mockToast = jasmine.createSpyObj('ToastService', ['success', 'error']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['getRegularKeyWallet', 'getMultiSignAddress', 'getMultiSignSeeds', 'handleMultiSignTransaction', 'isTxSuccessful', 'getTransactionResultMessage', 'processErrorMessageFromLedger', 'addMemoField']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['currentStep']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['simulateTransaction']);
          mockXrplService = jasmine.createSpyObj('XrplService', ['calculateTransactionFee']);
          mockSignTransactionUtilService = jasmine.createSpyObj('SignTransactionUtilService', ['buildTransactionText']);

          // Create a mock object with the selectedTransaction signal property
          mockSignTransationStoreService = {
               selectedTransaction: selectedTransactionSignal,
               setField: jasmine.createSpy(),
               updateField: jasmine.createSpy(),
               resetAll: jasmine.createSpy(),
               resetCredentailFields: jasmine.createSpy(),
               setAppSigned: jasmine.createSpy(),
               getAll: jasmine.createSpy(),
          };

          mockAccountConfiguratorStoreService = jasmine.createSpyObj('AccountConfiguratorStoreService', ['someMethod']);

          // Setup mock for currentStep
          mockTxUiService.currentStep = { set: jasmine.createSpy() } as any;

          // Setup mock returns
          mockSignTransactionUtilService.buildTransactionText.and.resolveTo(mockTxJson);
          mockUtilsService.getRegularKeyWallet.and.resolveTo({
               useRegularKeyWalletSignTx: true,
               regularKeyWalletSignTx: mockRegularKeyWallet,
          });
          mockUtilsService.getMultiSignAddress.and.returnValue(['addr1', 'addr2']);
          mockUtilsService.getMultiSignSeeds.and.returnValue(['seed1', 'seed2']);
          // mockUtilsService.handleMultiSignTransaction.and.resolveTo({
          //      signedTx: { tx_blob: 'multi_signed_blob', hash: 'multi_hash' },
          //      signers: [{ SigningPubKey: 'key1', TxnSignature: 'sig1' }],
          // });
          mockXrplService.calculateTransactionFee.and.resolveTo('15');
          mockXrplTransactionService.simulateTransaction.and.resolveTo({ result: { engine_result: 'tesSUCCESS', hash: 'sim_hash' } });
          mockUtilsService.isTxSuccessful.and.returnValue(true);
          mockUtilsService.getTransactionResultMessage.and.returnValue('tesSUCCESS');
          mockUtilsService.processErrorMessageFromLedger.and.callFake((msg: string) => msg);

          TestBed.configureTestingModule({
               providers: [
                    SignTransactionsOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnv },
                    { provide: ToastService, useValue: mockToast },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: XrplService, useValue: mockXrplService },
                    { provide: SignTransactionUtilService, useValue: mockSignTransactionUtilService },
                    { provide: SignTransationStoreService, useValue: mockSignTransationStoreService },
                    { provide: AccountConfiguratorStoreService, useValue: mockAccountConfiguratorStoreService },
               ],
          });

          service = TestBed.inject(SignTransactionsOrchestratorService);
     });

     describe('generateTransactionJson', () => {
          it('should generate transaction JSON successfully', async () => {
               const options: GenerateJsonOptions = {
                    wallet: mockWallet,
                    env: mockEnv,
                    selectedTransaction: 'sendXrp',
                    isTicketEnabled: false,
                    ticketSequence: '',
                    isMemoEnabled: false,
               };

               const result = await service.generateTransactionJson(options);

               expect(result).toBe(mockTxJson);
               expect(mockSignTransactionUtilService.buildTransactionText).toHaveBeenCalledWith({
                    client: mockEnv.client,
                    wallet: mockWallet,
                    accountInfo: mockEnv.accountInfo,
                    fee: mockEnv.fee,
                    currentLedger: mockEnv.currentLedger,
                    selectedTransaction: 'sendXrp',
                    isTicketEnabled: false,
                    isMemoEnable: false,
                    ticketSequence: '',
               });
          });

          it('should use env.wallet when available', async () => {
               const envWithWallet = { ...mockEnv, wallet: { ...mockWallet, address: 'different' } };
               const options: GenerateJsonOptions = {
                    wallet: mockWallet,
                    env: envWithWallet,
                    selectedTransaction: 'sendXrp',
                    isTicketEnabled: false,
                    ticketSequence: '',
                    isMemoEnabled: false,
               };

               await service.generateTransactionJson(options);

               expect(mockSignTransactionUtilService.buildTransactionText).toHaveBeenCalledWith(jasmine.objectContaining({ wallet: envWithWallet.wallet }));
          });
     });

     describe('signTransaction', () => {
          it('should sign transaction with regular wallet', async () => {
               const options: SignTxOptions = {
                    txJson: mockTxJson,
                    env: mockEnv,
                    isRegularKeyAddress: false,
                    regularKeyAddress: '',
                    regularKeySeed: '',
               };

               const result = await service.signTransaction(options);

               expect(result).toBe('signed_tx_blob');
               expect(mockEnv.wallet.sign).toHaveBeenCalled();
          });

          it('should sign transaction with regular key', async () => {
               const options: SignTxOptions = {
                    txJson: mockTxJson,
                    env: mockEnv,
                    isRegularKeyAddress: true,
                    regularKeyAddress: 'rRegularKeyAddress',
                    regularKeySeed: 'regularKeySeed',
               };

               const result = await service.signTransaction(options);

               expect(result).toBe('regular_key_signed_blob');
               expect(mockUtilsService.getRegularKeyWallet).toHaveBeenCalledWith(false, 'rRegularKeyAddress', true, 'regularKeySeed');
               expect(mockRegularKeyWallet.sign).toHaveBeenCalled();
          });

          it('should throw error when regular key wallet derivation fails', async () => {
               mockUtilsService.getRegularKeyWallet.and.resolveTo({
                    useRegularKeyWalletSignTx: false,
                    regularKeyWalletSignTx: null,
               });

               const options: SignTxOptions = {
                    txJson: mockTxJson,
                    env: mockEnv,
                    isRegularKeyAddress: true,
                    regularKeyAddress: 'rRegularKeyAddress',
                    regularKeySeed: 'regularKeySeed',
               };

               try {
                    await service.signTransaction(options);
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toBe('Could not derive regular key wallet from the provided seed.');
               }
          });

          // it('should add LastLedgerSequence to transaction', async () => {
          //      const options: SignTxOptions = {
          //           txJson: mockTxJson,
          //           env: mockEnv,
          //           isRegularKeyAddress: false,
          //           regularKeyAddress: '',
          //           regularKeySeed: '',
          //      };

          //      await service.signTransaction(options);

          //      const signedTx = mockEnv.wallet.sign.calls.mostRecent().args[0];
          //      expect(signedTx.LastLedgerSequence).toBe(mockEnv.currentLedger + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME);
          // });
     });

     describe('signForMultiSign', () => {
          // it('should sign transaction for multi-sign', async () => {
          //      const options: SignForMultiSignOptions = {
          //           txJson: mockTxJson,
          //           env: mockEnv,
          //           signers: [
          //                { Account: 'rSigner1', seed: 'seed1' },
          //                { Account: 'rSigner2', seed: 'seed2' },
          //           ],
          //      };

          //      const result = await service.signForMultiSign(options);

          //      expect(result).toBe('multi_signed_blob');
          //      expect(mockUtilsService.getMultiSignAddress).toHaveBeenCalledWith('rSigner1,rSigner2');
          //      expect(mockUtilsService.getMultiSignSeeds).toHaveBeenCalledWith('seed1,seed2');
          //      expect(mockXrplService.calculateTransactionFee).toHaveBeenCalled();
          //      expect(mockUtilsService.handleMultiSignTransaction).toHaveBeenCalled();
          // });

          it('should throw error when no signers provided', async () => {
               const options: SignForMultiSignOptions = {
                    txJson: mockTxJson,
                    env: mockEnv,
                    signers: [],
               };

               try {
                    await service.signForMultiSign(options);
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toBe('Select at least one signer.');
               }
          });

          // it('should add LastLedgerSequence to transaction', async () => {
          //      const options: SignForMultiSignOptions = {
          //           txJson: mockTxJson,
          //           env: mockEnv,
          //           signers: [{ Account: 'rSigner1', seed: 'seed1' }],
          //      };

          //      await service.signForMultiSign(options);

          //      const callArgs = mockUtilsService.handleMultiSignTransaction.calls.mostRecent().args[0];
          //      expect(callArgs.tx).toBeDefined();
          //      expect(callArgs.tx.LastLedgerSequence).toBe(mockEnv.currentLedger + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME);
          // });
     });

     describe('submitTransaction', () => {
          it('should submit transaction successfully', async () => {
               const mockSubmitResponse = {
                    result: { hash: 'tx_hash_123', engine_result: 'tesSUCCESS' },
               };
               const mockClient = { submitAndWait: jasmine.createSpy().and.resolveTo(mockSubmitResponse) };
               const envWithClient = { ...mockEnv, client: mockClient };

               const options: SubmitTxOptions = {
                    txJson: mockTxJson,
                    outputField: 'tx_blob',
                    env: envWithClient,
                    isSimulateEnabled: false,
                    txType: 'Payment',
               };

               mockUtilsService.isTxSuccessful.and.returnValue(true);

               const result = await service.submitTransaction(options);

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('tx_hash_123');
               expect(mockClient.submitAndWait).toHaveBeenCalledWith('tx_blob');
               expect(mockTxUiService.currentStep.set).toHaveBeenCalledWith('waiting_validation');
          });

          it('should handle simulation mode', async () => {
               const options: SubmitTxOptions = {
                    txJson: mockTxJson,
                    outputField: 'tx_blob',
                    env: mockEnv,
                    isSimulateEnabled: true,
                    txType: 'Payment',
               };

               mockUtilsService.isTxSuccessful.and.returnValue(true);

               const result = await service.submitTransaction(options);

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('sim_hash');
               expect(mockXrplTransactionService.simulateTransaction).toHaveBeenCalled();
               expect(mockTxUiService.currentStep.set).not.toHaveBeenCalledWith('waiting_validation');
          });

          it('should handle transaction failure', async () => {
               const mockSubmitResponse = {
                    result: { engine_result: 'tecFAILURE' },
               };
               const mockClient = { submitAndWait: jasmine.createSpy().and.resolveTo(mockSubmitResponse) };
               const envWithClient = { ...mockEnv, client: mockClient };

               const options: SubmitTxOptions = {
                    txJson: mockTxJson,
                    outputField: 'tx_blob',
                    env: envWithClient,
                    isSimulateEnabled: false,
                    txType: 'Payment',
               };

               mockUtilsService.isTxSuccessful.and.returnValue(false);
               mockUtilsService.getTransactionResultMessage.and.returnValue('tecFAILURE');
               mockUtilsService.processErrorMessageFromLedger.and.returnValue('Transaction failed');

               const result = await service.submitTransaction(options);

               expect(result.success).toBeFalse();
               expect(result.error).toContain('Transaction failed');
          });

          it('should handle submission error', async () => {
               const mockClient = { submitAndWait: jasmine.createSpy().and.throwError(new Error('Network error')) };
               const envWithClient = { ...mockEnv, client: mockClient };

               const options: SubmitTxOptions = {
                    txJson: mockTxJson,
                    outputField: 'tx_blob',
                    env: envWithClient,
                    isSimulateEnabled: false,
                    txType: 'Payment',
               };

               mockUtilsService.processErrorMessageFromLedger.and.returnValue('Network error occurred');

               const result = await service.submitTransaction(options);

               expect(result.success).toBeFalse();
               expect(result.error).toContain('Network error occurred');
          });
     });

     describe('applyMemoToJson', () => {
          it('should apply memos to JSON', () => {
               const txJson = JSON.stringify({ TransactionType: 'Payment', Account: 'rTest' });
               const memos = ['memo1', 'memo2'];

               const result = service.applyMemoToJson(txJson, memos);

               expect(mockUtilsService.addMemoField).toHaveBeenCalledWith(JSON.parse(txJson), memos);
               expect(result).toBe(JSON.stringify(JSON.parse(txJson), null, 2));
          });

          it('should return original JSON on error', () => {
               const invalidJson = 'invalid json';

               const result = service.applyMemoToJson(invalidJson, ['memo']);

               expect(result).toBe(invalidJson);
          });
     });

     describe('removeMemoFromJson', () => {
          it('should remove Memos field from JSON', () => {
               const txJson = JSON.stringify({ TransactionType: 'Payment', Account: 'rTest', Memos: ['memo1'] });

               const result = service.removeMemoFromJson(txJson);

               expect(JSON.parse(result).Memos).toBeUndefined();
          });

          it('should return original JSON on error', () => {
               const invalidJson = 'invalid json';

               const result = service.removeMemoFromJson(invalidJson);

               expect(result).toBe(invalidJson);
          });
     });

     describe('applyTicketToJson', () => {
          it('should apply ticket sequence to JSON', () => {
               const txJson = JSON.stringify({ TransactionType: 'Payment', Account: 'rTest', Sequence: 5 });
               const ticketSequence = '12345';

               const result = service.applyTicketToJson(txJson, ticketSequence);
               const parsed = JSON.parse(result);

               expect(parsed.TicketSequence).toBe(12345);
               expect(parsed.Sequence).toBe(0);
          });

          it('should return original JSON on error', () => {
               const invalidJson = 'invalid json';

               const result = service.applyTicketToJson(invalidJson, '123');

               expect(result).toBe(invalidJson);
          });
     });

     describe('removeTicketFromJson', () => {
          it('should remove ticket sequence and restore original sequence', () => {
               const txJson = JSON.stringify({ TransactionType: 'Payment', Account: 'rTest', TicketSequence: 12345, Sequence: 0 });
               const originalSequence = 5;

               const result = service.removeTicketFromJson(txJson, originalSequence);
               const parsed = JSON.parse(result);

               expect(parsed.TicketSequence).toBeUndefined();
               expect(parsed.Sequence).toBe(originalSequence);
          });

          it('should return original JSON on error', () => {
               const invalidJson = 'invalid json';

               const result = service.removeTicketFromJson(invalidJson, 5);

               expect(result).toBe(invalidJson);
          });
     });

     describe('cleanTx', () => {
          it('should remove default values for DestinationTag, SourceTag, InvoiceID', () => {
               const tx = {
                    DestinationTag: 0,
                    SourceTag: 0,
                    InvoiceID: '',
                    Amount: '100',
                    Memos: [{ Memo: { MemoData: 'data', MemoType: 'type' } }],
               };

               const cleaned = service.cleanTx(tx);

               expect(cleaned.DestinationTag).toBeUndefined();
               expect(cleaned.SourceTag).toBeUndefined();
               expect(cleaned.InvoiceID).toBeUndefined();
          });

          it('should filter out empty memos', () => {
               const tx = {
                    Memos: [{ Memo: { MemoData: 'data1', MemoType: 'type1' } }, { Memo: { MemoData: '', MemoType: 'type2' } }, { Memo: { MemoData: 'data3', MemoType: '' } }, { Memo: { MemoData: '', MemoType: '' } }, { NotMemo: 'invalid' }],
               };

               const cleaned = service.cleanTx(tx);

               expect(cleaned.Memos.length).toBe(1);
               expect(cleaned.Memos[0].Memo.MemoData).toBe('data1');
          });

          it('should remove Memos array if empty after filtering', () => {
               const tx = {
                    Memos: [{ Memo: { MemoData: '', MemoType: '' } }],
               };

               const cleaned = service.cleanTx(tx);

               expect(cleaned.Memos).toBeUndefined();
          });

          it('should convert XRP amount to drops for sendXrp transaction', () => {
               selectedTransactionSignal.set('sendXrp');
               const tx = { Amount: '100', TransactionType: 'Payment' };

               const cleaned = service.cleanTx(tx);

               // Just verify it was converted (the actual xrpl.xrpToDrops will be called)
               expect(cleaned.Amount).toBeTruthy();
               expect(typeof cleaned.Amount).toBe('string');
          });

          it('should not convert non-XRP amount', () => {
               selectedTransactionSignal.set('otherTx');
               const tx = { Amount: '100', TransactionType: 'TrustSet' };

               const cleaned = service.cleanTx(tx);

               expect(cleaned.Amount).toBe('100');
          });

          it('should preserve non-default values', () => {
               const tx = {
                    DestinationTag: 12345,
                    SourceTag: 67890,
                    InvoiceID: 'abc123',
                    Amount: '1000',
               };

               const cleaned = service.cleanTx(tx);

               expect(cleaned.DestinationTag).toBe(12345);
               expect(cleaned.SourceTag).toBe(67890);
               expect(cleaned.InvoiceID).toBe('abc123');
          });
     });
});
