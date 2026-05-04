import { TestBed } from '@angular/core/testing';
import { OfferTransactionBuilderService } from './offer-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { OfferState } from '../offer-store/offer-store.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';
import { OfferCreateFlags } from 'xrpl';

// Mock UtilsService
class MockUtilsService {
     encodeIfNeeded = jasmine.createSpy().and.callFake((code: string) => code);
}

describe('OfferTransactionBuilderService', () => {
     let service: OfferTransactionBuilderService;
     let utilsService: MockUtilsService;
     let mockWallet: xrpl.Wallet;
     let mockOffer: OfferState;
     let mockEnv: any;

     beforeEach(() => {
          utilsService = new MockUtilsService();

          TestBed.configureTestingModule({
               providers: [OfferTransactionBuilderService, { provide: UtilsService, useValue: utilsService }],
          });

          service = TestBed.inject(OfferTransactionBuilderService);

          mockWallet = {
               classicAddress: 'rTestAddress1234567890',
               publicKey: 'testPublicKey',
               privateKey: 'testPrivateKey',
          } as any;

          mockOffer = {
               weWantCurrency: 'USD',
               weWantIssuer: 'rIssuer1',
               weWantAmount: '100',
               weSpendCurrency: 'XRP',
               weSpendIssuer: '',
               weSpendAmount: '10',
               isMarketOrder: false,
               isFillOrKill: false,
               isPassive: false,
          } as any;

          mockEnv = {
               ledgerInfo: {
                    lastIndex: 123456,
               },
          };
     });

     describe('toXRPLCurrency', () => {
          it('should return XRP currency object when currency is XRP', () => {
               const result = service.toXRPLCurrency('XRP', '');
               expect(result).toEqual({ currency: 'XRP' });
          });

          it('should return currency object with issuer for non-XRP currency', () => {
               const result = service.toXRPLCurrency('USD', 'rIssuerAddress');
               expect(result).toEqual({ currency: 'USD', issuer: 'rIssuerAddress' });
          });

          it('should handle empty issuer for non-XRP currency', () => {
               const result = service.toXRPLCurrency('EUR', '');
               expect(result).toEqual({ currency: 'EUR', issuer: '' });
          });
     });

     describe('toCurrencyAmount (private method tested via buildOfferCreateTx)', () => {
          it('should convert XRP amount to drops', () => {
               // Tested through buildOfferCreateTx
               const mockOfferXRP: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'XRP',
                    weSpendAmount: '10',
                    weWantCurrency: 'USD',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferXRP, mockEnv);
               expect(tx.TakerGets).toBe(xrpl.xrpToDrops('10'));
          });

          it('should create issued currency amount for non-XRP', () => {
               const mockOfferToken: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'USD',
                    weSpendIssuer: 'rIssuer',
                    weSpendAmount: '100',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferToken, mockEnv);
               expect(tx.TakerGets).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer',
                    value: '100',
               });
          });

          it('should encode currency if needed', () => {
               utilsService.encodeIfNeeded.and.returnValue('encodedCurrency');

               const mockOfferEncoded: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'LONG_CURRENCY_CODE',
                    weSpendIssuer: 'rIssuer',
                    weSpendAmount: '100',
                    weWantCurrency: 'XRP',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferEncoded, mockEnv);
               expect(utilsService.encodeIfNeeded).toHaveBeenCalledWith('LONG_CURRENCY_CODE');
               expect((tx.TakerGets as any).currency).toBe('encodedCurrency');
          });
     });

     describe('buildOfferCreateTx', () => {
          it('should build OfferCreate transaction with XRP spend and token want', () => {
               const tx = service.buildOfferCreateTx(mockWallet, mockOffer, mockEnv);

               expect(tx.TransactionType).toBe('OfferCreate');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.TakerGets).toBe(xrpl.xrpToDrops('10'));
               expect(tx.TakerPays).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer1',
                    value: '100',
               });
               expect(tx.Flags).toBe(0);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should build OfferCreate transaction with token spend and XRP want', () => {
               const mockOfferTokenSpend: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'EUR',
                    weSpendIssuer: 'rIssuer2',
                    weSpendAmount: '50',
                    weWantCurrency: 'XRP',
                    weWantIssuer: '',
                    weWantAmount: '5',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferTokenSpend, mockEnv);

               expect(tx.TakerGets).toEqual({
                    currency: 'EUR',
                    issuer: 'rIssuer2',
                    value: '50',
               });
               expect(tx.TakerPays).toBe(xrpl.xrpToDrops('5'));
          });

          it('should build OfferCreate transaction with both tokens', () => {
               const mockOfferBothTokens: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'EUR',
                    weSpendIssuer: 'rIssuer2',
                    weSpendAmount: '50',
                    weWantCurrency: 'USD',
                    weWantIssuer: 'rIssuer1',
                    weWantAmount: '100',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferBothTokens, mockEnv);

               expect(tx.TakerGets).toEqual({
                    currency: 'EUR',
                    issuer: 'rIssuer2',
                    value: '50',
               });
               expect(tx.TakerPays).toEqual({
                    currency: 'USD',
                    issuer: 'rIssuer1',
                    value: '100',
               });
          });

          it('should set tfImmediateOrCancel flag for market order', () => {
               const mockOfferMarketOrder: OfferState = {
                    ...mockOffer,
                    isMarketOrder: true,
                    isFillOrKill: false,
                    isPassive: false,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferMarketOrder, mockEnv);
               expect(tx.Flags).toBe(OfferCreateFlags.tfImmediateOrCancel);
          });

          it('should set tfFillOrKill flag for fill or kill order', () => {
               const mockOfferFillOrKill: OfferState = {
                    ...mockOffer,
                    isMarketOrder: false,
                    isFillOrKill: true,
                    isPassive: false,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferFillOrKill, mockEnv);
               expect(tx.Flags).toBe(OfferCreateFlags.tfFillOrKill);
          });

          it('should set tfPassive flag for passive order', () => {
               const mockOfferPassive: OfferState = {
                    ...mockOffer,
                    isMarketOrder: false,
                    isFillOrKill: false,
                    isPassive: true,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferPassive, mockEnv);
               expect(tx.Flags).toBe(OfferCreateFlags.tfPassive);
          });

          it('should handle multiple flags priority (market order takes precedence)', () => {
               const mockOfferMultipleFlags: OfferState = {
                    ...mockOffer,
                    isMarketOrder: true,
                    isFillOrKill: true,
                    isPassive: true,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferMultipleFlags, mockEnv);
               // tfImmediateOrCancel should take precedence due to if-else chain
               expect(tx.Flags).toBe(OfferCreateFlags.tfImmediateOrCancel);
          });

          it('should handle fill or kill with passive (fill or kill takes precedence)', () => {
               const mockOfferFillOrKillPassive: OfferState = {
                    ...mockOffer,
                    isMarketOrder: false,
                    isFillOrKill: true,
                    isPassive: true,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferFillOrKillPassive, mockEnv);
               expect(tx.Flags).toBe(OfferCreateFlags.tfFillOrKill);
          });

          it('should calculate LastLedgerSequence correctly', () => {
               const tx = service.buildOfferCreateTx(mockWallet, mockOffer, mockEnv);
               const expectedLastLedger = mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;
               expect(tx.LastLedgerSequence).toBe(expectedLastLedger);
          });

          it('should handle zero flags when no order type specified', () => {
               const mockOfferNoFlags: OfferState = {
                    ...mockOffer,
                    isMarketOrder: false,
                    isFillOrKill: false,
                    isPassive: false,
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferNoFlags, mockEnv);
               expect(tx.Flags).toBe(0);
          });
     });

     describe('buildOfferCancelTx', () => {
          it('should build OfferCancel transaction correctly', () => {
               const sequence = 12345;
               const tx = service.buildOfferCancelTx(mockWallet, sequence, mockEnv);

               expect(tx.TransactionType).toBe('OfferCancel');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.OfferSequence).toBe(sequence);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle different sequence numbers', () => {
               const sequences = [1, 100, 999999];

               sequences.forEach(sequence => {
                    const tx = service.buildOfferCancelTx(mockWallet, sequence, mockEnv);
                    expect(tx.OfferSequence).toBe(sequence);
               });
          });

          it('should handle zero sequence', () => {
               const tx = service.buildOfferCancelTx(mockWallet, 0, mockEnv);
               expect(tx.OfferSequence).toBe(0);
          });

          it('should calculate LastLedgerSequence correctly for cancel', () => {
               const tx = service.buildOfferCancelTx(mockWallet, 123, mockEnv);
               const expectedLastLedger = mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;
               expect(tx.LastLedgerSequence).toBe(expectedLastLedger);
          });

          it('should handle different ledger indices', () => {
               const differentEnv = {
                    ledgerInfo: {
                         lastIndex: 999999,
                    },
               };

               const tx = service.buildOfferCancelTx(mockWallet, 123, differentEnv);
               expect(tx.LastLedgerSequence).toBe(999999 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('Edge cases', () => {
          it('should handle empty strings for currency and issuer', () => {
               const mockOfferEmptyStrings: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: '',
                    weSpendIssuer: '',
                    weSpendAmount: '0',
                    weWantCurrency: '',
                    weWantIssuer: '',
                    weWantAmount: '0',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferEmptyStrings, mockEnv);
               expect(tx.TakerGets).toEqual({
                    currency: '',
                    issuer: '',
                    value: '0',
               });
               expect(tx.TakerPays).toEqual({
                    currency: '',
                    issuer: '',
                    value: '0',
               });
          });

          it('should handle very large amounts', () => {
               const mockOfferLargeAmounts: OfferState = {
                    ...mockOffer,
                    weSpendAmount: '999999999.999999',
                    weWantAmount: '888888888.888888',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferLargeAmounts, mockEnv);
               expect(tx.TakerGets).toBe(xrpl.xrpToDrops('999999999.999999'));
               expect((tx.TakerPays as any).value).toBe('888888888.888888');
          });

          it('should handle very small amounts', () => {
               const mockOfferSmallAmounts: OfferState = {
                    ...mockOffer,
                    weSpendAmount: '0.000001',
                    weWantAmount: '0.000001',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferSmallAmounts, mockEnv);
               expect(tx.TakerGets).toBe(xrpl.xrpToDrops('0.000001'));
          });

          it('should encode currency codes that need encoding', () => {
               utilsService.encodeIfNeeded.and.callFake((code: string) => {
                    if (code === 'LONG_CURRENCY_CODE') return 'ENCODED123';
                    return code;
               });

               const mockOfferNeedEncoding: OfferState = {
                    ...mockOffer,
                    weSpendCurrency: 'LONG_CURRENCY_CODE',
                    weSpendIssuer: 'rIssuer',
                    weSpendAmount: '100',
                    weWantCurrency: 'ANOTHER_LONG_CODE',
                    weWantIssuer: 'rIssuer2',
                    weWantAmount: '200',
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOfferNeedEncoding, mockEnv);

               expect(utilsService.encodeIfNeeded).toHaveBeenCalledWith('LONG_CURRENCY_CODE');
               expect(utilsService.encodeIfNeeded).toHaveBeenCalledWith('ANOTHER_LONG_CODE');
               expect((tx.TakerGets as any).currency).toBe('ENCODED123');
          });

          it('should handle undefined env properties gracefully', () => {
               const minimalEnv = {
                    ledgerInfo: {
                         lastIndex: 1,
                    },
               };

               const tx = service.buildOfferCreateTx(mockWallet, mockOffer, minimalEnv);
               expect(tx.LastLedgerSequence).toBe(1 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('toXRPLCurrency additional tests', () => {
          it('should handle XRP with empty string', () => {
               const result = service.toXRPLCurrency('XRP', '');
               expect(result).toEqual({ currency: 'XRP' });
          });

          it('should handle XRP with issuer (should ignore issuer)', () => {
               const result = service.toXRPLCurrency('XRP', 'rSomeIssuer');
               expect(result).toEqual({ currency: 'XRP' });
          });

          it('should handle non-XRP with special characters in currency code', () => {
               const result = service.toXRPLCurrency('USD$', 'rIssuer');
               expect(result).toEqual({ currency: 'USD$', issuer: 'rIssuer' });
          });

          it('should handle numeric currency codes', () => {
               const result = service.toXRPLCurrency('123', 'rIssuer');
               expect(result).toEqual({ currency: '123', issuer: 'rIssuer' });
          });
     });
});
