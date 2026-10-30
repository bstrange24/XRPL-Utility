import { TestBed } from '@angular/core/testing';
import { AmmTransactionBuilderService } from './amm-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

describe('AmmTransactionBuilderService', () => {
     let service: AmmTransactionBuilderService;
     let utilsServiceMock: any;

     const mockWallet = { classicAddress: 'rTestWallet', address: 'rTestWallet' } as xrpl.Wallet;
     const mockEnv = {
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
          serverInfo: { result: { info: { validated_ledger: { reserve_inc_xrp: 0.2 } } } },
     };

     const mockAmmState = {
          weWantCurrency: 'USD',
          weWantIssuer: 'rIssuer1',
          weWantAmount: '100',
          weSpendCurrency: 'XRP',
          weSpendIssuer: '',
          weSpendAmount: '50',
          tradingFeeField: '0.05',
          withdrawlLpTokenFromPoolField: '10',
          holderField: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          assetPool1Balance: '0',
          assetPool2Balance: '0',
          lpTokenBalance: '0',
          availableCurrencies: [],
          selectedCurrencyFrom: null,
          selectedCurrencyTo: null,
          selectedIssuerFrom: null,
          selectedIssuerTo: null,
          weWantField: '',
          weSpendField: '',
          weWantCurrencyField: '',
          weSpendCurrencyField: '',
          weWantIssuerField: '',
          weSpendIssuerField: '',
          weWantAmountField: '',
          weSpendAmountField: '',
          lpTokenAmountField: '',
          asset: null,
          asset2: null,
          lpToken: null,
          amount: '',
          amount2: '',
          flags: 0,
          isSwap: false,
          isDeposit: false,
          isWithdraw: false,
          isCreate: false,
          isDelete: false,
          isClawback: false,
     } as any; // Use as any to avoid missing properties

     beforeEach(() => {
          utilsServiceMock = {
               encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((value: string) => value),
          };
          TestBed.configureTestingModule({
               providers: [AmmTransactionBuilderService, { provide: UtilsService, useValue: utilsServiceMock }],
          });

          service = TestBed.inject(AmmTransactionBuilderService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('toXRPLCurrency', () => {
          it('should return XRP currency object for XRP', () => {
               const result = service.toXRPLCurrency('XRP', '');
               expect(result).toEqual({ currency: 'XRP' });
          });

          it('should return currency with issuer for non-XRP', () => {
               const result = service.toXRPLCurrency('USD', 'rIssuer1');
               expect(result).toEqual({ currency: 'USD', issuer: 'rIssuer1' });
          });
     });

     describe('toCurrencyAmount', () => {
          it('should return drops for XRP', () => {
               const result = (service as any).toCurrencyAmount('XRP', '', '100');
               expect(result).toBe('100000000'); // xrpToDrops conversion
          });

          it('should return issued currency amount for non-XRP', () => {
               const result = (service as any).toCurrencyAmount('USD', 'rIssuer1', '100');
               expect(result).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '100' });
          });
     });

     describe('buildCreateAmmTx', () => {
          it('should build AMMCreate transaction when spend currency is XRP', () => {
               const result = service.buildCreateAmmTx(mockWallet, mockAmmState, mockEnv);
               expect(result.TransactionType).toBe('AMMCreate');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Amount).toBe('50000000'); // 50 XRP in drops
               expect(result.Amount2).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '100' });
               expect(result.TradingFee).toBe(50); // 0.05 * 1000 = 50
               expect(result.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(result.Fee).toBe('200000');
          });
     });

     describe('buildDepositToAmmTx', () => {
          const depositOptions = { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };

          it('should build AMMDeposit transaction for both pools', () => {
               const result = service.buildDepositToAmmTx(mockWallet, mockAmmState, mockEnv, depositOptions);
               expect(result.TransactionType).toBe('AMMDeposit');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Asset).toEqual({ currency: 'XRP' });
               expect(result.Asset2).toEqual({ currency: 'USD', issuer: 'rIssuer1' });
               expect(result.Flags).toBe(xrpl.AMMDepositFlags.tfTwoAsset);
          });

          it('should build AMMDeposit transaction for first pool only', () => {
               const options = { bothPools: false, firstPoolOnly: true, secondPoolOnly: false };
               const result = service.buildDepositToAmmTx(mockWallet, mockAmmState, mockEnv, options);
               expect(result.Flags).toBe(xrpl.AMMDepositFlags.tfSingleAsset);
               expect(result.Amount).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '100' });
               expect(result.Amount2).toBeUndefined();
          });

          it('should build AMMDeposit transaction for second pool only', () => {
               const options = { bothPools: false, firstPoolOnly: false, secondPoolOnly: true };
               const result = service.buildDepositToAmmTx(mockWallet, mockAmmState, mockEnv, options);
               expect(result.Flags).toBe(xrpl.AMMDepositFlags.tfSingleAsset);
               expect(typeof result.Amount).toBe('string');
               expect(result.Amount2).toBeUndefined();
          });
     });

     describe('buildWithdrawFromAmmTx', () => {
          const withdrawOptions = { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
          const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };

          it('should build AMMWithdraw transaction', () => {
               const result = service.buildWithdrawFromAmmTx(mockWallet, mockAmmState, mockEnv, withdrawOptions, lpToken);
               expect(result.TransactionType).toBe('AMMWithdraw');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.LPTokenIn).toEqual({
                    currency: 'LP_TOKEN',
                    issuer: 'rLPIssuer',
                    value: '10',
               });
               expect(result.Flags).toBe(xrpl.AMMWithdrawFlags.tfLPToken);
          });

          it('should build AMMWithdraw for one asset (first pool) with LP token burn', () => {
               const options = { bothPools: false, firstPoolOnly: true, secondPoolOnly: false };
               const result = service.buildWithdrawFromAmmTx(mockWallet, mockAmmState, mockEnv, options, lpToken);
               expect(result.Flags).toBe(xrpl.AMMWithdrawFlags.tfOneAssetLPToken);
               expect(result.Amount).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '0' });
          });

          it('should build AMMWithdraw for one asset (second pool) with LP token burn', () => {
               const options = { bothPools: false, firstPoolOnly: false, secondPoolOnly: true };
               const result = service.buildWithdrawFromAmmTx(mockWallet, mockAmmState, mockEnv, options, lpToken);
               expect(result.Flags).toBe(xrpl.AMMWithdrawFlags.tfOneAssetLPToken);
               expect(result.Amount).toBe('0');
          });
     });

     describe('buildClawbackFromAmmTx', () => {
          const issuerWallet = { classicAddress: 'rPdYxU9dNkbzC5Y2h4jLbVJ3rMRrk7WVRL' } as xrpl.Wallet;
          const clawbackAmm = { ...mockAmmState, weWantIssuer: issuerWallet.classicAddress };

          it('should build AMMClawback transaction', () => {
               const result = service.buildClawbackFromAmmTx(issuerWallet, clawbackAmm, mockEnv);
               expect(result.TransactionType).toBe('AMMClawback');
               expect(result.Account).toBe(issuerWallet.classicAddress);
               expect(result.Asset).toEqual({ currency: 'USD', issuer: issuerWallet.classicAddress });
               expect(result.Asset2).toEqual({ currency: 'XRP' });
               expect(result.Amount).toEqual({ currency: 'USD', issuer: issuerWallet.classicAddress, value: '10' });
          });

          it('should include Holder field when present', () => {
               const result = service.buildClawbackFromAmmTx(issuerWallet, clawbackAmm, mockEnv);
               expect(result.Holder).toBe('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B');
          });

          it('should omit Amount when the maximum clawback amount is blank', () => {
               const result = service.buildClawbackFromAmmTx(issuerWallet, { ...clawbackAmm, withdrawlLpTokenFromPoolField: '' }, mockEnv);
               expect(result.Amount).toBeUndefined();
          });
     });

     describe('buildSwapViaAmmTx', () => {
          const destination = 'rDestination';

          it('should build Payment transaction for swap', () => {
               const result = service.buildSwapViaAmmTx(mockWallet, mockAmmState, mockEnv, destination);
               expect(result.TransactionType).toBe('Payment');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Destination).toBe(destination);
               expect(result.Amount).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '100' });
               expect(result.DeliverMin).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '95' });
               expect(result.SendMax).toBe('50000000');
               expect(result.Flags).toBe(xrpl.PaymentFlags.tfPartialPayment);
          });

          it('should reject non-positive swap amounts', () => {
               expect(() => service.buildSwapViaAmmTx(mockWallet, { ...mockAmmState, weWantAmount: '0' }, mockEnv, 'rDest')).toThrowError('Target token amount must be a positive number.');
          });

          it('should reject a pool that is not a token/XRP pair', () => {
               expect(() => service.buildSwapViaAmmTx(mockWallet, { ...mockAmmState, weSpendCurrency: 'USD' }, mockEnv, 'rDest')).toThrowError('AMM pools require an issued token as Asset 1 and XRP as Asset 2.');
          });
     });

     describe('buildDeleteAmmTx', () => {
          it('should build AMMDelete transaction', () => {
               const result = service.buildDeleteAmmTx(mockWallet, mockAmmState, mockEnv);
               expect(result.TransactionType).toBe('AMMDelete');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Asset).toEqual({ currency: 'XRP' });
               expect(result.Asset2).toEqual({ currency: 'USD', issuer: 'rIssuer1' });
               expect(result.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('Edge Cases', () => {
          it('should require a valid holder in clawback', () => {
               const issuerWallet = { classicAddress: 'rPdYxU9dNkbzC5Y2h4jLbVJ3rMRrk7WVRL' } as xrpl.Wallet;
               const clawbackAmm = { ...mockAmmState, weWantIssuer: issuerWallet.classicAddress, holderField: '' };
               expect(() => service.buildClawbackFromAmmTx(issuerWallet, clawbackAmm, mockEnv)).toThrowError('A valid holder address distinct from the issuer is required for AMMClawback.');
          });

          it('should reject a zero withdrawal amount', () => {
               const ammZeroWithdrawal = { ...mockAmmState, withdrawlLpTokenFromPoolField: '0' };
               const withdrawOptions = { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };
               expect(() => service.buildWithdrawFromAmmTx(mockWallet, ammZeroWithdrawal, mockEnv, withdrawOptions, lpToken)).toThrowError('LP token amount must be a positive number.');
          });
     });
});
