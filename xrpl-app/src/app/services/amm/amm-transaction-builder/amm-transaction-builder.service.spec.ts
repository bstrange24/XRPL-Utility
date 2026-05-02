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
          holderField: 'rHolder',
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
               expect(result.Amount).toBeDefined();
          });

          it('should build AMMDeposit transaction for second pool only', () => {
               const options = { bothPools: false, firstPoolOnly: false, secondPoolOnly: true };
               const result = service.buildDepositToAmmTx(mockWallet, mockAmmState, mockEnv, options);
               expect(result.Flags).toBe(xrpl.AMMDepositFlags.tfSingleAsset);
               expect(result.Amount2).toBeDefined();
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

          it('should build AMMWithdraw with single asset flag', () => {
               const options = { bothPools: false, firstPoolOnly: true, secondPoolOnly: false };
               const result = service.buildWithdrawFromAmmTx(mockWallet, mockAmmState, mockEnv, options, lpToken);
               expect(result.Flags).toBe(xrpl.AMMWithdrawFlags.tfSingleAsset);
          });
     });

     describe('buildClawbackFromAmmTx', () => {
          const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };

          it('should build AMMClawback transaction', () => {
               const result = service.buildClawbackFromAmmTx(mockWallet, mockAmmState, mockEnv, lpToken);
               expect(result.TransactionType).toBe('AMMClawback');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Asset).toEqual({ currency: 'XRP' });
               expect(result.Asset2).toEqual({ currency: 'USD', issuer: 'rIssuer1' });
               expect(result.LPTokenIn).toEqual({
                    currency: 'LP_TOKEN',
                    issuer: 'rLPIssuer',
                    value: '10',
               });
          });

          it('should include Holder field when present', () => {
               const result = service.buildClawbackFromAmmTx(mockWallet, mockAmmState, mockEnv, lpToken);
               expect(result.Holder).toBe('rHolder');
          });
     });

     describe('buildSwapViaAmmTx', () => {
          const destination = 'rDestination';

          it('should build Payment transaction for swap', () => {
               const result = service.buildSwapViaAmmTx(mockWallet, mockAmmState, mockEnv, destination);
               expect(result.TransactionType).toBe('Payment');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Destination).toBe(destination);
               // Since weWantCurrency is 'USD' (non-XRP), Amount should be an object
               expect(result.Amount).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '100' });
               // SendMax is 'XRP' (50 XRP in drops)
               expect(result.SendMax).toBe('50000000');
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
          it('should handle empty holder field in clawback', () => {
               const ammWithoutHolder = { ...mockAmmState, holderField: undefined };
               const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };
               const result = service.buildClawbackFromAmmTx(mockWallet, ammWithoutHolder, mockEnv, lpToken);
               expect(result.Holder).toBeUndefined();
          });

          it('should handle zero withdrawal amount', () => {
               const ammZeroWithdrawal = { ...mockAmmState, withdrawlLpTokenFromPoolField: '0' };
               const withdrawOptions = { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };
               const result = service.buildWithdrawFromAmmTx(mockWallet, ammZeroWithdrawal, mockEnv, withdrawOptions, lpToken);
               expect(result.LPTokenIn?.value).toBe('0');
          });
     });
});
