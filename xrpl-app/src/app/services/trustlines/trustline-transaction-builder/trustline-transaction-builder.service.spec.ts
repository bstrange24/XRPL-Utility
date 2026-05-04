import { TestBed } from '@angular/core/testing';
import { TrustlineTransactionBuilderService } from './trustline-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock Buffer for tests
(window as any).Buffer = {
     from: (str: string) => ({
          toString: () => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};

describe('TrustlineTransactionBuilderService', () => {
     let service: TrustlineTransactionBuilderService;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;

     const mockWallet: xrpl.Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     } as any;

     const mockEnv: PrepareTxEnvironmentResult = {
          fee: '12',
          ledgerInfo: {
               lastIndex: 1000,
          },
     } as any;

     const mockPreparedConfig = {
          currency: {
               currency: 'USD',
               issuer: 'rIssuer123',
               amount: '1000',
          },
          trustline: {
               trustlineFlags: 131072,
               destination: 'rDestination123',
          },
     };

     beforeEach(() => {
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['encodeIfNeeded']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['someMethod']);

          mockUtilsService.encodeIfNeeded.and.callFake((str: string) => str);

          TestBed.configureTestingModule({
               providers: [TrustlineTransactionBuilderService, { provide: UtilsService, useValue: mockUtilsService }, { provide: XrplTransactionService, useValue: mockXrplTransactionService }],
          });

          service = TestBed.inject(TrustlineTransactionBuilderService);
     });

     describe('buildTrustSetTx', () => {
          it('should build a valid TrustSet transaction', () => {
               const tx = service.buildTrustSetTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(tx.TransactionType).toBe('TrustSet');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.LimitAmount).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer123',
                    value: '1000',
               });
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include Flags when trustlineFlags are provided', () => {
               const tx = service.buildTrustSetTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(tx.Flags).toBe(131072);
          });

          it('should not include Flags when trustlineFlags are not provided', () => {
               const configWithoutFlags = {
                    currency: {
                         currency: 'USD',
                         issuer: 'rIssuer123',
                         amount: '1000',
                    },
                    trustline: {},
               };

               const tx = service.buildTrustSetTx(mockWallet, mockEnv, {}, configWithoutFlags);

               expect(tx.Flags).toBeUndefined();
          });

          it('should encode currency if needed', () => {
               mockUtilsService.encodeIfNeeded.and.returnValue('ENC_USD');

               const tx = service.buildTrustSetTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(mockUtilsService.encodeIfNeeded).toHaveBeenCalledWith('USD');
               expect(tx.LimitAmount.currency).toBe('ENC_USD');
          });
     });

     describe('buildTrustSetRemoveTx', () => {
          it('should build a valid TrustSet transaction for removal', () => {
               const tx = service.buildTrustSetRemoveTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(tx.TransactionType).toBe('TrustSet');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.LimitAmount).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer123',
                    value: '0',
               });
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include Flags when trustlineFlags are provided', () => {
               const tx = service.buildTrustSetRemoveTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(tx.Flags).toBe(131072);
          });

          it('should not include Flags when trustlineFlags are not provided', () => {
               const configWithoutFlags = {
                    currency: {
                         currency: 'USD',
                         issuer: 'rIssuer123',
                         amount: '1000',
                    },
                    trustline: {},
               };

               const tx = service.buildTrustSetRemoveTx(mockWallet, mockEnv, {}, configWithoutFlags);

               expect(tx.Flags).toBeUndefined();
          });

          it('should encode currency if needed', () => {
               mockUtilsService.encodeIfNeeded.and.returnValue('ENC_USD');

               const tx = service.buildTrustSetRemoveTx(mockWallet, mockEnv, {}, mockPreparedConfig);

               expect(mockUtilsService.encodeIfNeeded).toHaveBeenCalledWith('USD');
               expect(tx.LimitAmount.currency).toBe('ENC_USD');
          });
     });

     describe('buildIssueCurrencyTx', () => {
          it('should build a valid Payment transaction for issuing currency', () => {
               const trustline = {
                    destination: 'rDestination123',
               };

               const tx = service.buildIssueCurrencyTx(mockWallet, mockEnv, trustline, mockPreparedConfig);

               expect(tx.TransactionType).toBe('Payment');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Destination).toBe('rDestination123');
               expect(tx.Amount).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer123',
                    value: '1000',
               });
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should encode currency if needed', () => {
               mockUtilsService.encodeIfNeeded.and.returnValue('ENC_USD');
               const trustline = {
                    destination: 'rDestination123',
               };

               const tx = service.buildIssueCurrencyTx(mockWallet, mockEnv, trustline, mockPreparedConfig);

               expect(mockUtilsService.encodeIfNeeded).toHaveBeenCalledWith('USD');
               expect((tx.Amount as any).currency).toBe('ENC_USD');
          });
     });

     describe('buildClawbackTx', () => {
          it('should build a valid Clawback transaction', () => {
               const trustline = {
                    destination: 'rDestination123',
               };

               const tx = service.buildClawbackTx(mockWallet, mockEnv, trustline, mockPreparedConfig);

               expect(tx.TransactionType).toBe('Clawback');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Amount).toEqual({
                    currency: 'USD',
                    issuer: 'rDestination123',
                    value: '1000',
               });
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should use trustline.destination as the issuer for clawback', () => {
               const trustline = {
                    destination: 'rHolderAddress',
               };

               const tx = service.buildClawbackTx(mockWallet, mockEnv, trustline, mockPreparedConfig);

               expect((tx.Amount as any).issuer).toBe('rHolderAddress');
          });

          it('should encode currency if needed', () => {
               mockUtilsService.encodeIfNeeded.and.returnValue('ENC_USD');
               const trustline = {
                    destination: 'rDestination123',
               };

               const tx = service.buildClawbackTx(mockWallet, mockEnv, trustline, mockPreparedConfig);

               expect(mockUtilsService.encodeIfNeeded).toHaveBeenCalledWith('USD');
               expect((tx.Amount as any).currency).toBe('ENC_USD');
          });
     });
});
