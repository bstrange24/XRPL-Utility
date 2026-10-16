import { TestBed } from '@angular/core/testing';
import { AmmTransactionBuilderService } from './amm-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';
import { XrplService } from '../../xrpl-services/xrpl.service';

describe('AmmTransactionBuilderService', () => {
     let service: AmmTransactionBuilderService;
     let utilsServiceMock: any;
     let xrplServiceMock: any;

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
          xrplServiceMock = { getAMMInfo: jasmine.createSpy('getAMMInfo') };

          TestBed.configureTestingModule({
               providers: [AmmTransactionBuilderService, { provide: UtilsService, useValue: utilsServiceMock }, { provide: XrplService, useValue: xrplServiceMock }],
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
          const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };

          it('should build AMMClawback transaction', () => {
               const result: any = service.buildClawbackFromAmmTx(mockWallet, mockAmmState, mockEnv, lpToken);
               expect(result.TransactionType).toBe('AMMClawback');
               expect(result.Account).toBe(mockWallet.classicAddress);
               expect(result.Asset).toEqual({ currency: 'USD', issuer: 'rIssuer1' });
               expect(result.Asset2).toEqual({ currency: 'XRP' });
               expect(result.Amount).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: '10' });
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

     describe('buildTx (swap)', () => {
          const client = {} as xrpl.Client;
          const ammInfoResponse = (amount: any, amount2: any) => ({ result: { amm: { account: 'rAmm', amount, amount2, trading_fee: 1000 } } });

          it('should send to the given destination and spend XRP for USD', async () => {
               xrplServiceMock.getAMMInfo.and.resolveTo(ammInfoResponse('10000000', { currency: 'USD', issuer: 'rIssuer1', value: '1000' }));
               const tx: any = await service.buildTx({ ...mockAmmState, weSpendAmount: '1' }, null, mockWallet, null, null, mockEnv, 'rDest', client);
               expect(tx.TransactionType).toBe('Payment');
               expect(tx.Destination).toBe('rDest');
               expect(tx.SendMax).toBe('1000000');
               expect(tx.Flags).toBe(xrpl.PaymentFlags.tfPartialPayment);
               expect(tx.Paths).toBeUndefined();
               expect(tx.Amount.currency).toBe('USD');
               expect(Number(tx.Amount.value)).toBeGreaterThan(Number(tx.DeliverMin.value));
               // 1000 * 1 / (10 + 1) * (1 - 1%) is about 90
               expect(Number(tx.Amount.value)).toBeCloseTo(90, 0);
          });

          it('should handle pools where amount/amount2 are reversed and the spend asset is issued', async () => {
               xrplServiceMock.getAMMInfo.and.resolveTo(ammInfoResponse('10000000', { currency: 'USD', issuer: 'rIssuer1', value: '1000' }));
               const amm = { ...mockAmmState, weWantCurrency: 'XRP', weWantIssuer: '', weSpendCurrency: 'USD', weSpendIssuer: 'rIssuer1', weSpendAmount: '100' };
               const tx: any = await service.buildTx(amm, null, mockWallet, null, null, mockEnv, '', client);
               expect(tx.Destination).toBe(mockWallet.classicAddress);
               expect(tx.SendMax).toEqual({ currency: 'USD', issuer: 'rIssuer1', value: jasmine.any(String) });
               expect(typeof tx.Amount).toBe('string');
               expect(typeof tx.DeliverMin).toBe('string');
          });

          it('should reject a non-positive spend amount', async () => {
               await expectAsync(service.buildTx({ ...mockAmmState, weSpendAmount: '0' }, null, mockWallet, null, null, mockEnv, 'rDest', client)).toBeRejectedWithError('Invalid swap amount');
          });

          it('should reject when the AMM does not exist', async () => {
               xrplServiceMock.getAMMInfo.and.resolveTo([]);
               await expectAsync(service.buildTx({ ...mockAmmState, weSpendAmount: '1' }, null, mockWallet, null, null, mockEnv, 'rDest', client)).toBeRejectedWithError('AMM pool not found for this asset pair');
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
          it('should require a holder in clawback', () => {
               const ammWithoutHolder = { ...mockAmmState, holderField: undefined };
               const lpToken = { currency: 'LP_TOKEN', issuer: 'rLPIssuer' };
               expect(() => service.buildClawbackFromAmmTx(mockWallet, ammWithoutHolder, mockEnv, lpToken)).toThrowError('Holder address is required for AMMClawback');
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
