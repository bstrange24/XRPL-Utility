import { TestBed } from '@angular/core/testing';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { BatchService } from './batch-service.service';

describe('BatchService', () => {
     let service: BatchService;
     let xrplService: jasmine.SpyObj<XrplService>;
     let utilsService: jasmine.SpyObj<UtilsService>;
     let mockClient: any;
     let mockWallet: any;

     beforeEach(() => {
          mockClient = {
               autofill: jasmine.createSpy().and.callFake((tx: any) => {
                    return Promise.resolve({
                         ...tx,
                         Sequence: 1,
                         LastLedgerSequence: 123456,
                         Fee: '12',
                    });
               }),
               submitAndWait: jasmine.createSpy().and.returnValue(Promise.resolve({ result: { hash: 'batchHash123', engine_result: 'tesSUCCESS' } })),
          };

          mockWallet = {
               classicAddress: 'rTestAddress',
               publicKey: 'PUBKEY123',
               sign: jasmine.createSpy().and.returnValue({ tx_blob: 'signedBlob', hash: 'hash123' }),
          };

          xrplService = jasmine.createSpyObj('XrplService', ['calculateTransactionFee']);
          utilsService = jasmine.createSpyObj('UtilsService', ['getMultiSignAddress', 'getMultiSignSeeds', 'handleMultiSignTransaction']);

          xrplService.calculateTransactionFee.and.returnValue(Promise.resolve('12'));
          utilsService.getMultiSignAddress.and.returnValue(['rSigner1', 'rSigner2']);
          utilsService.getMultiSignSeeds.and.returnValue(['seed1', 'seed2']);

          // Fix: Properly structure the handleMultiSignTransaction return value
          utilsService.handleMultiSignTransaction.and.returnValue(
               Promise.resolve({
                    signedTx: { tx_blob: 'multisignedBlob', hash: 'multiHash123' },
                    signers: [
                         {
                              Signer: {
                                   Account: 'rSigner1',
                                   TxnSignature: 'sig1',
                                   SigningPubKey: 'pubkey1',
                              },
                         },
                    ],
               })
          );

          TestBed.configureTestingModule({
               providers: [BatchService, { provide: XrplService, useValue: xrplService }, { provide: UtilsService, useValue: utilsService }],
          });

          service = TestBed.inject(BatchService);
     });

     describe('submitBatchTransaction', () => {
          const innerTxns = [
               { TransactionType: 'Payment', Amount: '1000000', Destination: 'rDest1' },
               { TransactionType: 'Payment', Amount: '2000000', Destination: 'rDest2' },
          ];
          const batchFlags = 0;

          it('should submit batch transaction with single signer', async () => {
               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, { isMultiSign: false });

               expect(mockClient.autofill).toHaveBeenCalled();
               expect(mockWallet.sign).toHaveBeenCalled();
               expect(mockClient.submitAndWait).toHaveBeenCalledWith('signedBlob');
               expect(response.result.hash).toBe('batchHash123');
          });

          it('should submit batch transaction with regular key signer', async () => {
               const regularKeyWallet = {
                    sign: jasmine.createSpy().and.returnValue({ tx_blob: 'regularKeySigned', hash: 'regHash123' }),
               };

               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, {
                    isMultiSign: false,
                    useRegularKeyWalletSignTx: regularKeyWallet as any,
               });

               expect(regularKeyWallet.sign).toHaveBeenCalled();
               expect(mockClient.submitAndWait).toHaveBeenCalledWith('regularKeySigned');
               expect(response).toBeTruthy();
          });

          it('should submit batch transaction with multi-sign', async () => {
               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, {
                    isMultiSign: true,
                    signerAddresses: 'rSigner1,rSigner2',
                    signerSeeds: 'seed1,seed2',
                    fee: '12',
               });

               expect(utilsService.getMultiSignAddress).toHaveBeenCalledWith('rSigner1,rSigner2');
               expect(utilsService.getMultiSignSeeds).toHaveBeenCalledWith('seed1,seed2');
               expect(utilsService.handleMultiSignTransaction).toHaveBeenCalled();
               expect(mockClient.submitAndWait).toHaveBeenCalledWith('multisignedBlob');
               expect(response).toBeTruthy();
          });

          it('should throw error when no inner transactions provided', async () => {
               await expectAsync(service.submitBatchTransaction(mockClient, mockWallet, [], batchFlags)).toBeRejectedWithError('No inner transactions provided');
          });

          it('should throw error when inner transactions is null', async () => {
               await expectAsync(service.submitBatchTransaction(mockClient, mockWallet, null as any, batchFlags)).toBeRejectedWithError('No inner transactions provided');
          });

          it('should throw error for multi-sign with no signer addresses', async () => {
               utilsService.getMultiSignAddress.and.returnValue([]);

               await expectAsync(
                    service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, {
                         isMultiSign: true,
                         signerAddresses: '',
                         signerSeeds: 'seed1,seed2',
                    })
               ).toBeRejectedWithError('No signer addresses/seeds provided for multi-signing');
          });

          it('should throw error for multi-sign with no signer seeds', async () => {
               utilsService.getMultiSignSeeds.and.returnValue([]);

               await expectAsync(
                    service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, {
                         isMultiSign: true,
                         signerAddresses: 'rSigner1,rSigner2',
                         signerSeeds: '',
                    })
               ).toBeRejectedWithError('No signer addresses/seeds provided for multi-signing');
          });

          it('should throw error when signing fails', async () => {
               const failingWallet = {
                    sign: jasmine.createSpy().and.returnValue(null),
               };

               await expectAsync(service.submitBatchTransaction(mockClient, failingWallet as any, innerTxns, batchFlags, { isMultiSign: false })).toBeRejectedWithError('Failed to sign batch transaction');
          });

          it('should handle multi-sign with default fee when not provided', async () => {
               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, {
                    isMultiSign: true,
                    signerAddresses: 'rSigner1,rSigner2',
                    signerSeeds: 'seed1,seed2',
                    // fee not provided
               });

               expect(response).toBeTruthy();
               expect(utilsService.handleMultiSignTransaction).toHaveBeenCalled();
          });

          it('should properly format inner transactions with zero fee', async () => {
               await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, { isMultiSign: false });

               const autofillCall = mockClient.autofill.calls.mostRecent();
               const batchTx = autofillCall.args[0];

               expect(batchTx.TransactionType).toBe('Batch');
               expect(batchTx.Account).toBe(mockWallet.classicAddress);
               expect(batchTx.Flags).toBe(batchFlags);
               expect(batchTx.SigningPubKey).toBe(mockWallet.publicKey);
               expect(batchTx.RawTransactions).toBeDefined();
               expect(batchTx.RawTransactions.length).toBe(2);
               expect(batchTx.RawTransactions[0].RawTransaction.Fee).toBe('0');
               expect(batchTx.RawTransactions[0].RawTransaction.Account).toBe(mockWallet.classicAddress);
          });

          it('should handle empty options object', async () => {
               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, undefined);

               expect(response).toBeTruthy();
               expect(mockWallet.sign).toHaveBeenCalled();
          });

          it('should handle options with only isMultiSign false', async () => {
               const response = await service.submitBatchTransaction(mockClient, mockWallet, innerTxns, batchFlags, { isMultiSign: false });

               expect(response).toBeTruthy();
          });

          it('should handle single inner transaction', async () => {
               const singleTxn = [{ TransactionType: 'Payment', Amount: '1000000', Destination: 'rDest1' }];

               const response = await service.submitBatchTransaction(mockClient, mockWallet, singleTxn, batchFlags, { isMultiSign: false });

               expect(response).toBeTruthy();
               const autofillCall = mockClient.autofill.calls.mostRecent();
               expect(autofillCall.args[0].RawTransactions.length).toBe(1);
          });

          it('should handle large batch of transactions', async () => {
               const manyTxns = Array.from({ length: 50 }, (_, i) => ({
                    TransactionType: 'Payment',
                    Amount: `${1000000 + i}`,
                    Destination: `rDest${i}`,
               }));

               const response = await service.submitBatchTransaction(mockClient, mockWallet, manyTxns, batchFlags, { isMultiSign: false });

               expect(response).toBeTruthy();
               const autofillCall = mockClient.autofill.calls.mostRecent();
               expect(autofillCall.args[0].RawTransactions.length).toBe(50);
          });
     });
});
