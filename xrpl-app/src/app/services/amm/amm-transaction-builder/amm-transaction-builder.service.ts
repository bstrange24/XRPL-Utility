import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PoolOptions } from '../../../components/amm/constants/amm.types';
import { AmmState } from '../amm-store/amm-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionBuilderService {
     private readonly utilsService = inject(UtilsService);

     private assertTokenXrpPair(amm: AmmState): void {
          if (!amm.weWantCurrency || amm.weWantCurrency === 'XRP' || !amm.weWantIssuer || amm.weSpendCurrency !== 'XRP') {
               throw new Error('AMM pools require an issued token as Asset 1 and XRP as Asset 2.');
          }
     }

     private positiveAmount(value: string, label: string): string {
          const cleaned = value.replaceAll(',', '').trim();
          if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) {
               throw new Error(`${label} must be a positive number.`);
          }

          const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned;
          if (!Number.isFinite(Number(normalized)) || Number(normalized) <= 0) {
               throw new Error(`${label} must be a positive number.`);
          }
          return normalized;
     }

     private applySlippage(amount: string, slippageBps: number): string {
          const [whole, fraction = ''] = amount.split('.');
          const amountDigits = BigInt(`${whole}${fraction}`);
          const slippageAdjustedDigits = amountDigits * BigInt(10_000 - slippageBps);
          const scale = fraction.length + 4;
          const padded = slippageAdjustedDigits.toString().padStart(scale + 1, '0');
          const integer = padded.slice(0, -scale);
          const decimal = padded.slice(-scale).replace(/0+$/, '');
          return decimal ? `${integer}.${decimal}` : integer;
     }

     toXRPLCurrency(currency: string, issuer: string): xrpl.Currency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer };
     }

     toCurrencyAmount(currency: string, issuer: string, amount: string): string | xrpl.IssuedCurrencyAmount {
          if (currency === 'XRP') return xrpl.xrpToDrops(amount);
          return { currency: this.utilsService.encodeIfNeeded(currency), issuer, value: amount };
     }

     buildCreateAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any): xrpl.AMMCreate {
          this.assertTokenXrpPair(amm);
          const we_want = this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, amm.weWantAmount);
          const we_spend = this.toCurrencyAmount(amm.weSpendCurrency, amm.weSpendIssuer, amm.weSpendAmount);
          const tradingFeeBps = Math.round(Number(amm.tradingFeeField) * 1000);
          const reserveIncrementXrp = Number(env.serverInfo?.result?.info?.validated_ledger?.reserve_inc_xrp);
          if (!Number.isFinite(reserveIncrementXrp) || reserveIncrementXrp <= 0) {
               throw new Error('Unable to determine the AMM creation reserve fee.');
          }

          return {
               TransactionType: 'AMMCreate',
               Account: wallet.classicAddress,
               Amount: we_spend,
               Amount2: we_want,
               TradingFee: tradingFeeBps,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: xrpl.xrpToDrops(reserveIncrementXrp.toString()),
          };
     }

     buildDepositToAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, depositOptions: PoolOptions): xrpl.AMMDeposit {
          this.assertTokenXrpPair(amm);
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);

          let we_want_amount = amm.weWantAmount;
          let we_spend_amount = amm.weSpendAmount;
          if (depositOptions.firstPoolOnly) we_spend_amount = '0';
          if (depositOptions.secondPoolOnly) we_want_amount = '0';

          const we_want = this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, we_want_amount);
          const we_spend = this.toCurrencyAmount(amm.weSpendCurrency, amm.weSpendIssuer, we_spend_amount);

          const assetDef: xrpl.Currency = this.toXRPLCurrency(weSpendCurrency, typeof we_spend === 'string' ? '' : (we_spend.issuer ?? ''));
          const asset2Def: xrpl.Currency = this.toXRPLCurrency(weWantCurrency, typeof we_want === 'string' ? '' : (we_want.issuer ?? ''));

          const baseFields = {
               TransactionType: 'AMMDeposit' as const,
               Account: wallet.classicAddress,
               Asset: assetDef,
               Asset2: asset2Def,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          const toAmt = (a: string | xrpl.IssuedCurrencyAmount) => (typeof a === 'string' ? a : { currency: a.currency, issuer: a.issuer, value: a.value });

          if (depositOptions.bothPools) {
               return { ...baseFields, Amount: toAmt(we_spend), Amount2: toAmt(we_want), Flags: xrpl.AMMDepositFlags.tfTwoAsset };
          } else if (depositOptions.firstPoolOnly) {
               return { ...baseFields, Amount: toAmt(we_want), Flags: xrpl.AMMDepositFlags.tfSingleAsset };
          } else {
               return { ...baseFields, Amount: toAmt(we_spend), Flags: xrpl.AMMDepositFlags.tfSingleAsset };
          }
     }

     buildWithdrawFromAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, withdrawOptions: PoolOptions, lpToken: { currency: string; issuer: string }): xrpl.AMMWithdraw {
          this.assertTokenXrpPair(amm);
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);
          const cleanLpAmount = this.positiveAmount(amm.withdrawlLpTokenFromPoolField, 'LP token amount');

          const lpTokenAmount: xrpl.IssuedCurrencyAmount = {
               currency: lpToken.currency,
               issuer: lpToken.issuer,
               value: cleanLpAmount,
          };

          const baseFields = {
               TransactionType: 'AMMWithdraw' as const,
               Account: wallet.classicAddress,
               Asset: this.toXRPLCurrency(weSpendCurrency, amm.weSpendIssuer),
               Asset2: this.toXRPLCurrency(weWantCurrency, amm.weWantIssuer),
               LPTokenIn: lpTokenAmount,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // tfOneAssetLPToken needs Amount to name the asset received; zero means no minimum payout
          if (withdrawOptions.bothPools) {
               return { ...baseFields, Flags: xrpl.AMMWithdrawFlags.tfLPToken };
          } else if (withdrawOptions.firstPoolOnly) {
               const amount = this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, '0');
               return { ...baseFields, Amount: amount, Flags: xrpl.AMMWithdrawFlags.tfOneAssetLPToken };
          } else {
               const amount = this.toCurrencyAmount(amm.weSpendCurrency, amm.weSpendIssuer, '0');
               return { ...baseFields, Amount: amount, Flags: xrpl.AMMWithdrawFlags.tfOneAssetLPToken };
          }
     }

     buildClawbackFromAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any): xrpl.AMMClawback {
          this.assertTokenXrpPair(amm);
          if (amm.weWantIssuer !== wallet.classicAddress) {
               throw new Error('The selected token issuer must be the signing account to claw back tokens.');
          }

          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const holder = typeof amm.holderField === 'string' ? amm.holderField.trim() : '';
          if (!xrpl.isValidAddress(holder) || holder === wallet.classicAddress) {
               throw new Error('A valid holder address distinct from the issuer is required for AMMClawback.');
          }

          const amountValue = typeof amm.withdrawlLpTokenFromPoolField === 'string' && amm.withdrawlLpTokenFromPoolField.trim()
               ? this.positiveAmount(amm.withdrawlLpTokenFromPoolField, 'Maximum token amount')
               : undefined;

          return {
               TransactionType: 'AMMClawback',
               Account: wallet.classicAddress,
               Asset: { currency: weWantCurrency, issuer: amm.weWantIssuer },
               Asset2: { currency: 'XRP' } as xrpl.IssuedCurrency,
               ...(amountValue ? { Amount: { currency: weWantCurrency, issuer: amm.weWantIssuer, value: amountValue } } : {}),
               Holder: holder,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildSwapViaAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, destination: string): xrpl.Payment {
          this.assertTokenXrpPair(amm);
          const spendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);
          const receiveCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const spendAmount = this.positiveAmount(amm.weSpendAmount, 'Maximum XRP spend');
          const targetReceiveAmount = this.positiveAmount(amm.weWantAmount, 'Target token amount');
          const minimumReceiveAmount = this.applySlippage(targetReceiveAmount, 500);

          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destination || wallet.classicAddress,
               Amount: { currency: receiveCurrency, issuer: amm.weWantIssuer, value: targetReceiveAmount },
               SendMax: xrpl.xrpToDrops(spendAmount),
               DeliverMin: { currency: receiveCurrency, issuer: amm.weWantIssuer, value: minimumReceiveAmount },
               Flags: xrpl.PaymentFlags.tfPartialPayment,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildDeleteAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any): xrpl.AMMDelete {
          this.assertTokenXrpPair(amm);
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);

          return {
               TransactionType: 'AMMDelete',
               Account: wallet.classicAddress,
               Asset: this.toXRPLCurrency(weSpendCurrency, amm.weSpendIssuer),
               Asset2: this.toXRPLCurrency(weWantCurrency, amm.weWantIssuer),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }
}
