import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PoolOptions } from '../../../components/amm/constants/amm.types';
import { AmmState } from '../amm-store/amm-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionBuilderService {
     private readonly utilsService = inject(UtilsService);
     private readonly xrplService = inject(XrplService);

     toXRPLCurrency(currency: string, issuer: string): xrpl.Currency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer };
     }

     toCurrencyAmount(currency: string, issuer: string, amount: string): string | xrpl.IssuedCurrencyAmount {
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
               Asset: this.toXRPLCurrency(weSpendCurrency, amm.weSpendIssuer) as xrpl.IssuedCurrency,
               Asset2: this.toXRPLCurrency(weWantCurrency, amm.weWantIssuer) as xrpl.IssuedCurrency,
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

     buildClawbackFromAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, lpToken: { currency: string; issuer: string; balance?: string }): xrpl.AMMClawback {
          const weWantCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);
          const weSpendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);

          const amountValue = Number.parseFloat(amm.withdrawlLpTokenFromPoolField || '0');
          if (Number.isNaN(amountValue) || amountValue <= 0) {
               throw new Error('Invalid LP token amount for clawback');
          }

          const holder = amm.holderField || '';
          if (!holder) {
               throw new Error('Holder address is required for AMMClawback');
          }

          // Build assets
          const asset = this.toXRPLCurrency(weWantCurrency, amm.weWantIssuer);
          const asset2 = this.toXRPLCurrency(weSpendCurrency, amm.weSpendIssuer);

          // For AMMClawback, the Amount MUST use the Asset.currency
          const amount = {
               currency: weWantCurrency, // Use JOE
               issuer: amm.weWantIssuer,
               value: amountValue.toString(),
          };

          console.log('=== AMMClawback Debug ===');
          console.log('Asset:', asset);
          console.log('Asset2:', asset2);
          console.log('Amount:', amount);
          console.log('Holder:', holder);

          const tx: xrpl.AMMClawback = {
               TransactionType: 'AMMClawback',
               Account: wallet.classicAddress,
               Asset: asset as any,
               Asset2: asset2 as any,
               Amount: amount,
               Holder: holder,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     async buildTx(amm: AmmState, plan: any, wallet: xrpl.Wallet, input: any, output: any, env: any, destination: string, client: xrpl.Client) {
          console.log('=== Starting buildTx - EXPLICIT AMM PATH ===');

          const spendAmount = Number(amm.weSpendAmount || 0);
          const slippageBps = 1500; // 15% tolerance on Devnet

          if (spendAmount <= 0) {
               throw new Error('Invalid swap amount');
          }

          // Constant-product estimate: out = reserveWant * spend / (reserveSpend + spend), minus the trading fee
          const pool1 = this.toXRPLCurrency(amm.weSpendCurrency, amm.weSpendIssuer);
          const pool2 = this.toXRPLCurrency(amm.weWantCurrency, amm.weWantIssuer);
          const resp = await this.xrplService.getAMMInfo(client, pool1, pool2, wallet.classicAddress, 'validated');
          const ammInfo = resp?.result?.amm;
          if (!ammInfo) {
               throw new Error('AMM pool not found for this asset pair');
          }

          const matches = (amt: xrpl.Amount, currency: string) => (currency === 'XRP' ? typeof amt === 'string' : typeof amt !== 'string' && amt.currency === this.utilsService.encodeIfNeeded(currency));
          const spendIsFirst = matches(ammInfo.amount, amm.weSpendCurrency);
          const reserveSpend = this.getAmountValue(spendIsFirst ? ammInfo.amount : ammInfo.amount2);
          const reserveWant = this.getAmountValue(spendIsFirst ? ammInfo.amount2 : ammInfo.amount);
          const feeRate = (ammInfo.trading_fee ?? 0) / 100000;

          const expectedOut = ((reserveWant * spendAmount) / (reserveSpend + spendAmount)) * (1 - feeRate);
          const minOut = expectedOut * (1 - slippageBps / 10000);

          console.log('Swap calc:', { spend: spendAmount, expected: expectedOut, minOut });

          const toWantAmount = (v: number) => this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, amm.weWantCurrency === 'XRP' ? v.toFixed(6) : v.toPrecision(15));
          const sendMax = this.toCurrencyAmount(amm.weSpendCurrency, amm.weSpendIssuer, amm.weSpendCurrency === 'XRP' ? spendAmount.toFixed(6) : spendAmount.toPrecision(15));

          const tx: any = {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destination || wallet.classicAddress,
               Amount: toWantAmount(expectedOut),
               SendMax: sendMax,
               Flags: xrpl.PaymentFlags.tfPartialPayment,
               DeliverMin: toWantAmount(minOut),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          console.log('Final tx:', JSON.stringify(tx, null, 2));
          return tx;
     }

     getAmountValue(amount: xrpl.Amount): number {
          if (typeof amount === 'string') {
               return Number(amount) / 1_000_000; // XRP drops → XRP
          }

          if ('value' in amount) {
               return Number(amount.value);
          }

          throw new Error('Unknown XRPL Amount format');
     }

     buildSwapViaAmmTx(wallet: xrpl.Wallet, amm: AmmState, env: any, destination: string): xrpl.Payment {
          const spendCurrency = this.utilsService.encodeIfNeeded(amm.weSpendCurrency);
          const receiveCurrency = this.utilsService.encodeIfNeeded(amm.weWantCurrency);

          const spendAmount = Number(amm.weSpendAmount || 0);
          const minReceiveAmount = Number(amm.weWantAmount || 0);

          if (spendAmount <= 0 || minReceiveAmount <= 0) {
               throw new Error('Invalid swap amounts');
          }

          // ----------------------------
          // INPUT (what you send)
          // ----------------------------
          const sendMax =
               amm.weSpendCurrency === 'XRP'
                    ? xrpl.xrpToDrops(spendAmount.toString())
                    : {
                           currency: spendCurrency,
                           issuer: amm.weSpendIssuer,
                           value: spendAmount.toFixed(6),
                      };

          // ----------------------------
          // OUTPUT FLOOR
          // ----------------------------
          const slippageBps = 500; // 5%
          const minOut = (minReceiveAmount * (1 - slippageBps / 10000)).toFixed(6);

          const deliverMin =
               amm.weWantCurrency === 'XRP'
                    ? undefined
                    : {
                           currency: receiveCurrency,
                           issuer: amm.weWantIssuer,
                           value: minOut,
                      };

          const tx: xrpl.Payment = {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destination,

               // Desired output; partial payment lets it deliver less, down to DeliverMin
               Amount: this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, amm.weWantCurrency === 'XRP' ? minReceiveAmount.toFixed(6) : String(amm.weWantAmount)),
               SendMax: sendMax,

               // OUTPUT FLOOR
               DeliverMin: this.toCurrencyAmount(amm.weWantCurrency, amm.weWantIssuer, amm.weWantCurrency === 'XRP' ? (minReceiveAmount * (1 - slippageBps / 10000)).toFixed(6) : minOut),

               // REQUIRED for swap semantics
               Flags: xrpl.PaymentFlags.tfPartialPayment,

               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          console.log('=== HYBRID SWAP (FIXED) ===');
          console.log('SendMax:', sendMax);
          console.log('DeliverMin:', deliverMin);
          console.log('Destination:', destination);

          return tx;
     }

     buildSwapViaAmmTx12312(wallet: xrpl.Wallet, amm: AmmState, env: any, destination: string): xrpl.Payment {
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
