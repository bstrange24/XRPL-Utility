import { TestBed } from '@angular/core/testing';
import { PaymentChannelTransactionBuilderService } from './payment-channel-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock UtilsService
class MockUtilsService {
     toRippleTime = jasmine.createSpy().and.returnValue(1000000);
     setCancelAfter = jasmine.createSpy();
     setExpiration = jasmine.createSpy();
}

describe('PaymentChannelTransactionBuilderService', () => {
     let service: PaymentChannelTransactionBuilderService;
     let utilsService: MockUtilsService;
     let mockWallet: xrpl.Wallet;
     let mockEnv: PrepareTxEnvironmentResult;
     let mockPaymentChannel: any;

     beforeEach(() => {
          utilsService = new MockUtilsService();

          TestBed.configureTestingModule({
               providers: [PaymentChannelTransactionBuilderService, { provide: UtilsService, useValue: utilsService }],
          });

          service = TestBed.inject(PaymentChannelTransactionBuilderService);

          mockWallet = {
               classicAddress: 'rTestAddress1234567890',
               publicKey: 'PUBKEY123',
               privateKey: 'PRIVKEY123',
          } as xrpl.Wallet;

          mockEnv = {
               fee: '12',
               ledgerInfo: {
                    lastIndex: 123456,
                    currentRippleTime: 500000,
               },
          } as PrepareTxEnvironmentResult;

          mockPaymentChannel = {
               amount: '100',
               destination: 'rDestination123',
               settleDelay: '86400',
               channelIDField: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
               channelClaimSignatureField: 'SIGNATURE123',
               publicKeyField: 'PUBKEY456',
               flags: {
                    claimAndClose: false,
               },
               paymentChannelCancelAfterTimeField: '',
          };
     });

     describe('buildCreatePaymentChannelTx', () => {
          it('should build PaymentChannelCreate transaction without cancel after time', () => {
               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.TransactionType).toBe('PaymentChannelCreate');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Amount).toBe(xrpl.xrpToDrops('100'));
               expect(tx.Destination).toBe('rDestination123');
               expect(tx.SettleDelay).toBe(86400);
               expect(tx.PublicKey).toBe(mockWallet.publicKey);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(123456 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.CancelAfter).toBeUndefined();
          });

          it('should build PaymentChannelCreate transaction with cancel after time', () => {
               mockPaymentChannel.paymentChannelCancelAfterTimeField = '2024-12-31';
               utilsService.toRippleTime.and.returnValue(800000);

               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(utilsService.toRippleTime).toHaveBeenCalledWith('2024-12-31');
               expect(utilsService.setCancelAfter).toHaveBeenCalledWith(tx, 800000);
          });

          it('should throw error if cancel after time is in the past', () => {
               mockPaymentChannel.paymentChannelCancelAfterTimeField = '2024-12-31';
               utilsService.toRippleTime.and.returnValue(400000); // Less than currentRippleTime (500000)

               expect(() => {
                    service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               }).toThrowError('Channel expiration time must be in the future');
          });

          it('should handle string amount conversion correctly', () => {
               mockPaymentChannel.amount = '250.5';
               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Amount).toBe(xrpl.xrpToDrops('250.5'));
          });

          it('should handle large amount values', () => {
               mockPaymentChannel.amount = '999999999.999999';
               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Amount).toBe(xrpl.xrpToDrops('999999999.999999'));
          });
     });

     describe('buildFundPaymentChannelTx', () => {
          it('should build PaymentChannelFund transaction without cancel after time', () => {
               const tx = service.buildFundPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.TransactionType).toBe('PaymentChannelFund');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Channel).toBe(mockPaymentChannel.channelIDField);
               expect(tx.Amount).toBe(xrpl.xrpToDrops('100'));
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(123456 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.Expiration).toBeUndefined();
          });

          it('should build PaymentChannelFund transaction with expiration', () => {
               mockPaymentChannel.paymentChannelCancelAfterTimeField = '2024-12-31';
               utilsService.toRippleTime.and.returnValue(800000);

               const tx = service.buildFundPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(utilsService.toRippleTime).toHaveBeenCalledWith('2024-12-31');
               expect(utilsService.setExpiration).toHaveBeenCalledWith(tx, 800000);
          });

          it('should throw error if expiration time is in the past', () => {
               mockPaymentChannel.paymentChannelCancelAfterTimeField = '2024-12-31';
               utilsService.toRippleTime.and.returnValue(400000);

               expect(() => {
                    service.buildFundPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               }).toThrowError('Channel expiration time must be in the future');
          });

          it('should handle zero amount', () => {
               mockPaymentChannel.amount = '0';
               const tx = service.buildFundPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Amount).toBe(xrpl.xrpToDrops('0'));
          });
     });

     describe('buildClaimPaymentChannelTx', () => {
          it('should build PaymentChannelClaim transaction without claimAndClose flag', () => {
               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.TransactionType).toBe('PaymentChannelClaim');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Channel).toBe(mockPaymentChannel.channelIDField);
               expect(tx.Balance).toBe(xrpl.xrpToDrops('100'));
               expect(tx.Signature).toBe('SIGNATURE123');
               expect(tx.PublicKey).toBe('PUBKEY456');
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(123456 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.Flags).toBeUndefined();
          });

          it('should build PaymentChannelClaim transaction with claimAndClose flag', () => {
               mockPaymentChannel.flags.claimAndClose = true;

               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.Flags).toBe(xrpl.PaymentChannelClaimFlags.tfClose);
          });

          it('should use wallet public key if publicKeyField is not provided', () => {
               mockPaymentChannel.publicKeyField = '';

               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.PublicKey).toBe(mockWallet.publicKey);
          });

          it('should handle null publicKeyField', () => {
               mockPaymentChannel.publicKeyField = null;

               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.PublicKey).toBe(mockWallet.publicKey);
          });

          it('should handle zero balance', () => {
               mockPaymentChannel.amount = '0';
               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Balance).toBe(xrpl.xrpToDrops('0'));
          });
     });

     describe('buildRenewPaymentChannelTx', () => {
          it('should build PaymentChannelClaim transaction with renew flag', () => {
               const tx = service.buildRenewPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.TransactionType).toBe('PaymentChannelClaim');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Channel).toBe(mockPaymentChannel.channelIDField);
               expect(tx.Flags).toBe(xrpl.PaymentChannelClaimFlags.tfRenew);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(123456 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.Balance).toBeUndefined();
               expect(tx.Signature).toBeUndefined();
               expect(tx.PublicKey).toBeUndefined();
          });

          it('should handle different channel IDs', () => {
               mockPaymentChannel.channelIDField = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
               const tx = service.buildRenewPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Channel).toBe(mockPaymentChannel.channelIDField);
          });
     });

     describe('buildClosePaymentChannelTx', () => {
          it('should build PaymentChannelClaim transaction with close flag', () => {
               const tx = service.buildClosePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);

               expect(tx.TransactionType).toBe('PaymentChannelClaim');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Channel).toBe(mockPaymentChannel.channelIDField);
               expect(tx.Flags).toBe(xrpl.PaymentChannelClaimFlags.tfClose);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(123456 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.Balance).toBeUndefined();
               expect(tx.Signature).toBeUndefined();
               expect(tx.PublicKey).toBeUndefined();
          });

          it('should work with different wallet addresses', () => {
               const differentWallet = {
                    classicAddress: 'rDifferentAddress',
                    publicKey: 'DIFFPUBKEY',
               } as xrpl.Wallet;

               const tx = service.buildClosePaymentChannelTx(differentWallet, mockEnv, mockPaymentChannel);
               expect(tx.Account).toBe('rDifferentAddress');
          });
     });

     describe('Edge Cases', () => {
          it('should handle missing ledgerInfo gracefully', () => {
               const minimalEnv = {
                    fee: '12',
                    ledgerInfo: {
                         lastIndex: 1,
                         currentRippleTime: 500000,
                    },
               } as PrepareTxEnvironmentResult;

               const tx = service.buildCreatePaymentChannelTx(mockWallet, minimalEnv, mockPaymentChannel);
               expect(tx.LastLedgerSequence).toBe(1 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle undefined fee', () => {
               const envWithoutFee = {
                    ledgerInfo: {
                         lastIndex: 123456,
                         currentRippleTime: 500000,
                    },
               } as PrepareTxEnvironmentResult;

               const tx = service.buildCreatePaymentChannelTx(mockWallet, envWithoutFee, mockPaymentChannel);
               expect(tx.Fee).toBeUndefined();
          });

          it('should handle settle delay as number', () => {
               mockPaymentChannel.settleDelay = 12345;
               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.SettleDelay).toBe(12345);
          });

          it('should handle settle delay as string number', () => {
               mockPaymentChannel.settleDelay = '67890';
               const tx = service.buildCreatePaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.SettleDelay).toBe(67890);
          });

          it('should handle signature with mixed case', () => {
               mockPaymentChannel.channelClaimSignatureField = 'MiXeDcAsEsIgNaTuRe';
               const tx = service.buildClaimPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Signature).toBe('MiXeDcAsEsIgNaTuRe');
          });

          it('should handle very long channel IDs', () => {
               const longChannelId = '1'.repeat(64);
               mockPaymentChannel.channelIDField = longChannelId;
               const tx = service.buildFundPaymentChannelTx(mockWallet, mockEnv, mockPaymentChannel);
               expect(tx.Channel).toBe(longChannelId);
          });
     });
});
