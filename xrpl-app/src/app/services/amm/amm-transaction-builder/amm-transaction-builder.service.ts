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

     toXRPLCurrency(currency: string, issuer: string): xrpl.Currency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer };
     }

     private toCurrencyAmount(currency: string, issuer: string, amount: string): string | xrpl.IssuedCurrencyAmount {
          if (currency === 'XRP') return xrpl.xrpToDrops(amount);
          return { currency: this.utilsService.encodeIfNeeded(currency), issuer, value: amount };
     }

     buildCreateAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any): xrpl.AMMCreate {
          const we_want = this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, amm.weWantAmount);
          const we_spend = this.toCurrencyAmount(amm.weSpendCurrency, amm.weSpendIssuer, amm.weSpendAmount);
          const tradingFeeBps = Math.round(Number(amm.tradingFeeField) * 1000);
          const isSpendXrp = amm.weSpendCurrency === 'XRP';

          return {
               TransactionType: 'AMMCreate',
               Account: wallet.classicAddress,
               Amount: isSpendXrp ? we_spend : we_want,
               Amount2: isSpendXrp ? we_want : we_spend,
               TradingFee: tradingFeeBps,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: (Number(env.fee) * 150000).toString(),
          };
     }

     buildDepositToAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, depositOptions: PoolOptions): xrpl.AMMDeposit {
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

          const toAmt = (a: string | xrpl.IssuedCurrencyAmount) => (typeof a === 'string' ? a : ({ currency: a.currency, issuer: a.issuer, value: a.value } as xrpl.IssuedCurrencyAmount));

          if (depositOptions.bothPools) {
               return { ...baseFields, Amount: toAmt(we_spend), Amount2: toAmt(we_want), Flags: xrpl.AMMDepositFlags.tfTwoAsset };
          } else if (depositOptions.firstPoolOnly) {
               return { ...baseFields, Amount: toAmt(we_spend), Flags: xrpl.AMMDepositFlags.tfSingleAsset };
          } else {
               return { ...baseFields, Amount2: toAmt(we_want), Flags: xrpl.AMMDepositFlags.tfSingleAsset };
          }
     }

     buildWithdrawFromAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, withdrawOptions: PoolOptions, lpToken: { currency: string; issuer: string }): xrpl.AMMWithdraw {
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);
          const cleanLpAmount = amm.withdrawlLpTokenFromPoolField.replaceAll(',', '');

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

          if (withdrawOptions.bothPools) {
               return { ...baseFields, Flags: xrpl.AMMWithdrawFlags.tfLPToken };
          } else if (withdrawOptions.firstPoolOnly) {
               return { ...baseFields, Flags: xrpl.AMMWithdrawFlags.tfSingleAsset };
          } else {
               return { ...baseFields, Flags: xrpl.AMMWithdrawFlags.tfSingleAsset };
          }
     }

     buildClawbackFromAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, lpToken: { currency: string; issuer: string }): any {
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);

          const tx: any = {
               TransactionType: 'AMMClawback',
               Account: wallet.classicAddress,
               Asset: this.toXRPLCurrency(weSpendCurrency, amm.weSpendIssuer),
               Asset2: this.toXRPLCurrency(weWantCurrency, amm.weWantIssuer),
               LPTokenIn: {
                    currency: lpToken.currency,
                    issuer: lpToken.issuer,
                    value: amm.withdrawlLpTokenFromPoolField || '0',
               },
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (amm.holderField) {
               tx.Holder = amm.holderField;
          }

          return tx;
     }

     buildSwapViaAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, destination: string): xrpl.Payment {
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);

          const sendMax: string | xrpl.IssuedCurrencyAmount = amm.weSpendCurrency === 'XRP' ? xrpl.xrpToDrops(amm.weSpendAmount) : { currency: weSpendCurrency, issuer: amm.weSpendIssuer, value: amm.weSpendAmount };

          const amount: string | xrpl.IssuedCurrencyAmount = amm.weWantCurrency === 'XRP' ? xrpl.xrpToDrops(amm.weWantAmount) : { currency: weWantCurrency, issuer: amm.weWantIssuer, value: amm.weWantAmount };

          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destination,
               Amount: amount,
               SendMax: sendMax,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildDeleteAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any): xrpl.AMMDelete {
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
