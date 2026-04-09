import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { OfferStoreService } from '../offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../offer-transaction-view-model/offer-transaction-view-model.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import * as xrpl from 'xrpl';
import BigNumber from 'bignumber.js';
import { AppConstants } from '../../../core/app.constants';
import { OfferCurrencyService } from '../offer-currency/offer-currency.service';

@Injectable({
     providedIn: 'root',
})
export class OfferUtilsService {
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly offerTransactionViewModelService = inject(OfferTransactionViewModelService);
     private readonly copyUtilService = inject(CopyUtilService);

     private amountTimeout: ReturnType<typeof setTimeout> | null = null;

     readonly actionButtonLabel = computed(() => {
          const tab = this.offerTransactionViewModelService.activeTab();
          switch (tab) {
               case 'createOffer':
                    return 'Create Offer';
               case 'getOrderBook':
                    return 'Get Order Book';
               case 'cancelOffer':
                    return 'Cancel Offer';
               default:
                    return 'Submit';
          }
     });

     readonly actionButtonClass = computed(() => {
          const tab = this.offerTransactionViewModelService.activeTab();
          switch (tab) {
               case 'createOffer':
                    return 'btn-primary-green';
               case 'getOrderBook':
                    return 'btn-primary-blue';
               case 'cancelOffer':
                    return 'btn-primary-red';
               default:
                    return 'btn-primary-blue';
          }
     });

     clearInputFields(): void {
          this.offerStoreService.resetOfferFields();
     }

     invertOrder(): void {
          const tempCurr = this.offerStoreService.weWantCurrency();
          const tempIss = this.offerStoreService.weWantIssuer();
          const tempAmt = this.offerStoreService.weWantAmount();

          this.offerStoreService.setField('weWantCurrency', this.offerStoreService.weSpendCurrency());
          this.offerStoreService.setField('weSpendCurrency', tempCurr);
          this.offerStoreService.setField('weWantIssuer', this.offerStoreService.weSpendIssuer());
          this.offerStoreService.setField('weSpendIssuer', tempIss);
          this.offerStoreService.setField('weSpendAmount', tempAmt || '');

          const newWeWant = this.offerStoreService.weWantCurrency();
          const newWeSpend = this.offerStoreService.weSpendCurrency();
          const currentWallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();

          if (currentWallet) {
               this.offerCurrency.selectWeWantCurrency(newWeWant, currentWallet as any);
               this.offerCurrency.selectWeSpendCurrency(newWeSpend, currentWallet as any);
          }
     }

     getExistingOffers(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): any[] {
          const offers = (accountObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Offer' && obj.Account === classicAddress);

          const sequences = offers.map((obj: any) => obj.Sequence);
          this.offerStoreService.setField('offersArray', sequences);

          const mapped = offers.map((obj: any): any => {
               let takerGetsUI: string = '';
               let takerPaysUI: string = '';

               const tg = obj.TakerGets;
               const tp = obj.TakerPays;

               if (typeof tg === 'string') {
                    takerGetsUI = String(xrpl.dropsToXrp(tg));
               } else if (tg?.value) {
                    const currency = this.utilsService.normalizeCurrencyCode(tg.currency);
                    takerGetsUI = `${tg.value} ${currency} ${tg.issuer}`;
               }

               if (typeof tp === 'string') {
                    takerPaysUI = String(xrpl.dropsToXrp(tp));
               } else if (tp?.value) {
                    const currency = this.utilsService.normalizeCurrencyCode(tp.currency);
                    takerPaysUI = `${tp.value} ${currency} ${tp.issuer}`;
               }

               return {
                    LedgerEntryType: obj.LedgerEntryType,
                    Account: obj.Account,
                    TakerGets: takerGetsUI,
                    TakerPays: takerPaysUI,
                    Flags: obj.Flags,
                    BookDirectory: obj.BookDirectory,
                    TxHash: obj.index,
                    Sequence: obj.Sequence,
               };
          });

          this.offerStoreService.setField('existingOffers', mapped);
          return mapped;
     }

     async fetchOrderBook(client: xrpl.Client, wallet: xrpl.Wallet): Promise<void> {
          this.txUiService.clearAllOptionsAndMessages();
          try {
               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               type CurrencyAmount = { currency: string; value: string; issuer?: string };

               const we_want: CurrencyAmount = weWantCurr === AppConstants.XRP_CURRENCY ? { currency: 'XRP', value: this.offerStoreService.weWantAmount() } : { currency: this.utilsService.encodeIfNeeded(weWantCurr), issuer: this.offerStoreService.weWantIssuer(), value: this.offerStoreService.weWantAmount() };

               const we_spend: CurrencyAmount = weSpendCurr === AppConstants.XRP_CURRENCY ? { currency: 'XRP', value: this.offerStoreService.weSpendAmount() } : { currency: this.utilsService.encodeIfNeeded(weSpendCurr), issuer: this.offerStoreService.weSpendIssuer(), value: this.offerStoreService.weSpendAmount() };

               const displayWeWant = this.utilsService.decodeIfNeeded(we_want.currency);
               const displayWeSpend = this.utilsService.decodeIfNeeded(we_spend.currency);
               const offerType = we_spend.currency === AppConstants.XRP_CURRENCY ? 'buy' : 'sell';

               if (weWantCurr && weSpendCurr) {
                    const [orderBook, counterOrderBook, ammData] = await Promise.all([
                         client.request({ command: 'book_offers', taker: wallet.classicAddress, ledger_index: 'current', taker_gets: we_want, taker_pays: we_spend }),
                         client.request({ command: 'book_offers', taker: wallet.classicAddress, ledger_index: 'current', taker_gets: we_spend, taker_pays: we_want }),
                         client.request({ command: 'amm_info', asset: we_spend.currency !== 'XRP' ? { currency: we_spend.currency, issuer: we_spend.issuer } : { currency: 'XRP' }, asset2: we_want.currency !== 'XRP' ? { currency: we_want.currency, issuer: we_want.issuer } : { currency: 'XRP' } } as any).catch(() => null) as any,
                    ]);

                    const combinedOffers: any[] = [...orderBook.result.offers];

                    if (ammData?.result?.amm) {
                         const amm = ammData.result.amm;
                         const takerGets = we_want.currency !== 'XRP' ? { currency: we_want.currency, issuer: we_want.issuer!, value: typeof amm.amount2 === 'string' ? String(xrpl.dropsToXrp(amm.amount2)) : amm.amount2.value } : typeof amm.amount2 === 'string' ? amm.amount2 : amm.amount2.value;
                         const takerPays = we_spend.currency !== 'XRP' ? { currency: we_spend.currency, issuer: we_spend.issuer!, value: typeof amm.amount === 'string' ? String(xrpl.dropsToXrp(amm.amount)) : amm.amount.value } : typeof amm.amount === 'string' ? amm.amount : amm.amount.value;
                         combinedOffers.unshift({ Account: amm.account || 'AMM_POOL', Flags: 0, LedgerEntryType: 'Offer', Sequence: 0, TakerGets: takerGets, TakerPays: takerPays, isAMM: true });
                    }

                    const spread = this.computeBidAskSpread(offerType === 'sell' ? counterOrderBook.result.offers : combinedOffers, offerType === 'sell' ? combinedOffers : counterOrderBook.result.offers);
                    const liquidity = this.computeLiquidityRatio(offerType === 'sell' ? counterOrderBook.result.offers : combinedOffers, offerType === 'sell' ? combinedOffers : counterOrderBook.result.offers, offerType === 'sell');
                    const stats = this.computeAverageExchangeRateBothWays(combinedOffers, 5);

                    const pair = `${displayWeWant}/${displayWeSpend}`;
                    this.offerStoreService.setField('orderBookPair', pair);
                    this.offerStoreService.setField('orderBookStats', {
                         // vwap: stats.forward.vwap.toFixed(8) ? stats.forward.vwap.toFixed(8) : 0,
                         // simpleAvg: stats.forward.simpleAvg.toFixed(8) ? stats.forward.simpleAvg.toFixed(8) : 0,
                         // bestRate: stats.forward.bestRate.toFixed(8) ? stats.forward.bestRate.toFixed(8) : 0,
                         // spread: spread.spread.toFixed(8) ? spread.spread.toFixed(8) : 0,
                         // spreadPercent: spread.spreadPercent.toFixed(2) ? spread.spreadPercent.toFixed(2) : 0,
                         // liquidityRatio: liquidity.ratio.toFixed(2) ? liquidity.ratio.toFixed(2) : 0,
                         // depth: `${stats.forward.depthDOG.toFixed(2)} ${displayWeWant} for ${stats.forward.depthXRP.toFixed(2)} ${displayWeSpend}`,
                         // execution: stats.forward.insufficientLiquidity ? `Insufficient liquidity: ${stats.forward.executionDOG.toFixed(2)} ${displayWeWant} for ${stats.forward.executionXRP.toFixed(2)} ${displayWeSpend}` : `Receive ${stats.forward.executionDOG.toFixed(2)} ${displayWeWant} for 15 ${displayWeSpend}`,
                         // volatility: `${stats.forward.volatility.toFixed(8)} (${stats.forward.volatilityPercent.toFixed(2)}%)`,

                         vwap: stats?.forward?.vwap != null ? stats.forward.vwap.toFixed(8) : '0',
                         simpleAvg: stats?.forward?.simpleAvg != null ? stats.forward.simpleAvg.toFixed(8) : '0',
                         bestRate: stats?.forward?.bestRate != null ? stats.forward.bestRate.toFixed(8) : '0',
                         spread: spread?.spread != null ? spread.spread.toFixed(8) : '0',
                         spreadPercent: spread?.spreadPercent != null ? spread.spreadPercent.toFixed(2) : '0',
                         liquidityRatio: liquidity?.ratio != null ? liquidity.ratio.toFixed(2) : '0',
                         depth: `${stats?.forward?.depthDOG != null ? stats.forward.depthDOG.toFixed(2) : '0'} ${displayWeWant} for ${stats?.forward?.depthXRP != null ? stats.forward.depthXRP.toFixed(2) : '0'} ${displayWeSpend}`,
                         execution: stats?.forward?.insufficientLiquidity ? `Insufficient liquidity: ${stats.forward.executionDOG.toFixed(2)} ${displayWeWant} for ${stats.forward.executionXRP.toFixed(2)} ${displayWeSpend}` : `Receive ${stats.forward.executionDOG.toFixed(2)} ${displayWeWant} for 15 ${displayWeSpend}`,
                         volatility: `${stats?.forward?.volatility != null ? stats.forward.volatility.toFixed(8) : '0'} (${stats?.forward?.volatilityPercent != null ? stats.forward.volatilityPercent.toFixed(2) : '0'}%)`,
                    });
               } else {
                    this.offerStoreService.setField('orderBookStats', {
                         vwap: 0,
                         simpleAvg: 0,
                         bestRate: 0,
                         spread: 0,
                         spreadPercent: 0,
                         liquidityRatio: 0,
                         depth: `N/A`,
                         execution: `N/A`,
                         volatility: `N/A`,
                    });
               }
          } catch (error: any) {
               console.error('Error in fetchOrderBook:', error);
               this.txUiService.setError(`${error.message || 'Transaction failed'}`);
          }
     }

     onWeSpendAmountChange(): void {
          if (this.amountTimeout) clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => this.updateTokenBalanceAndExchange(), 400);
     }

     onWeWantAmountChange(): void {
          if (this.amountTimeout) clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => this.updateTokenBalanceAndExchangeReverse(), 400);
     }

     async updateTokenBalanceAndExchange(): Promise<void> {
          const weSpendAmt = this.offerStoreService.weSpendAmount();
          if (!weSpendAmt || parseFloat(weSpendAmt) <= 0) {
               this.offerStoreService.setField('weWantAmount', '0');
               return;
          }

          this.txUiService.spinner.set(true);
          // this.txUiService.showSpinnerWithDelay('Calculating best rate...', 500);

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               type CA = { currency: string; value: string; issuer?: string };

               const weWant: CA = weWantCurr === 'XRP' ? { currency: 'XRP', value: '0' } : { currency: weWantCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weWantCurr) : weWantCurr, issuer: this.offerStoreService.weWantIssuer(), value: '0' };
               const weSpend: CA = weSpendCurr === 'XRP' ? { currency: 'XRP', value: weSpendAmt } : { currency: weSpendCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weSpendCurr) : weSpendCurr, issuer: this.offerStoreService.weSpendIssuer(), value: weSpendAmt };

               const client = (await (this.offerCurrency as any).getClient?.()) ?? null;
               if (!client) return;

               const [orderBook] = await Promise.all([client.request({ command: 'book_offers', taker_gets: weWant, taker_pays: weSpend, limit: 400, ledger_index: 'current', taker: (wallet as any).classicAddress })]);

               const allOffers = [...orderBook.result.offers];
               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.normalizeAmount(a.TakerGets)).dividedBy(this.normalizeAmount(a.TakerPays));
                    const rateB = new BigNumber(this.normalizeAmount(b.TakerGets)).dividedBy(this.normalizeAmount(b.TakerPays));
                    return rateA.minus(rateB).toNumber();
               });

               let remaining = new BigNumber(weSpendAmt);
               let totalReceived = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remaining.lte(0)) break;
                    const pays = new BigNumber(this.normalizeAmount(offer.TakerPays));
                    const gets = new BigNumber(this.normalizeAmount(offer.TakerGets));
                    if (pays.isZero()) continue;
                    const use = BigNumber.min(remaining, pays);
                    const received = use.multipliedBy(gets).dividedBy(pays);
                    totalReceived = totalReceived.plus(received);
                    remaining = remaining.minus(use);
               }

               this.offerStoreService.setField('weWantAmount', totalReceived.toFixed(8));
               this.offerStoreService.setField('insufficientLiquidityWarning', remaining.gt(0));
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchange:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
               this.offerStoreService.setField('weWantAmount', '0');
          } finally {
               this.txUiService.spinner.set(false);
          }
     }

     async updateTokenBalanceAndExchangeReverse(): Promise<void> {
          const weWantAmt = this.offerStoreService.weWantAmount();
          if (!weWantAmt || parseFloat(weWantAmt) <= 0) {
               this.offerStoreService.setField('weSpendAmount', '0');
               return;
          }

          this.txUiService.spinner.set(true);
          // this.txUiService.showSpinnerWithDelay('Calculating required amount...', 500);

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               type CA = { currency: string; value: string; issuer?: string };

               const weWant: CA = weWantCurr === 'XRP' ? { currency: 'XRP', value: weWantAmt } : { currency: weWantCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weWantCurr) : weWantCurr, issuer: this.offerStoreService.weWantIssuer(), value: weWantAmt };
               const weSpend: CA = weSpendCurr === 'XRP' ? { currency: 'XRP', value: '0' } : { currency: weSpendCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weSpendCurr) : weSpendCurr, issuer: this.offerStoreService.weSpendIssuer(), value: '0' };

               const client = (await (this.offerCurrency as any).getClient?.()) ?? null;
               if (!client) return;

               const [orderBook] = await Promise.all([client.request({ command: 'book_offers', taker_gets: weWant, taker_pays: weSpend, limit: 400, ledger_index: 'current', taker: (wallet as any).classicAddress })]);

               const allOffers = [...orderBook.result.offers];
               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.normalizeAmount(a.TakerPays)).dividedBy(this.normalizeAmount(a.TakerGets));
                    const rateB = new BigNumber(this.normalizeAmount(b.TakerPays)).dividedBy(this.normalizeAmount(b.TakerGets));
                    return rateA.minus(rateB).toNumber();
               });

               let remainingReceive = new BigNumber(weWantAmt);
               let totalPay = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remainingReceive.lte(0)) break;
                    const availableReceive = new BigNumber(this.normalizeAmount(offer.TakerGets));
                    const payForThis = new BigNumber(this.normalizeAmount(offer.TakerPays));
                    if (availableReceive.isZero()) continue;
                    const rate = payForThis.dividedBy(availableReceive);
                    const useReceive = BigNumber.min(remainingReceive, availableReceive);
                    const requiredPay = useReceive.multipliedBy(rate);
                    totalPay = totalPay.plus(requiredPay);
                    remainingReceive = remainingReceive.minus(useReceive);
               }

               this.offerStoreService.setField('weSpendAmount', totalPay.toFixed(8));
               this.offerStoreService.setField('insufficientLiquidityWarning', remainingReceive.gt(0));
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchangeReverse:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
               this.offerStoreService.setField('weSpendAmount', '0');
          } finally {
               this.txUiService.spinner.set(false);
          }
     }

     private normalizeAmount(val: any): string {
          if (typeof val === 'string') {
               return /^\d+$/.test(val) ? String(xrpl.dropsToXrp(val)) : val;
          }
          return val?.value ?? '0';
     }

     private computeBidAskSpread(tokenXrpOffers: any[], xrpTokenOffers: any[]) {
          let bestTokenXrp = 0;
          if (tokenXrpOffers.length > 0) {
               const o = tokenXrpOffers[0];
               const getsValue = o.TakerGets?.value ? parseFloat(o.TakerGets.value) : parseFloat(o.TakerGets) / 1_000_000;
               const paysValue = o.TakerPays?.value ? parseFloat(o.TakerPays.value) : parseFloat(o.TakerPays) / 1_000_000;
               bestTokenXrp = getsValue / paysValue;
          }
          let bestXrpToken = 0;
          if (xrpTokenOffers.length > 0) {
               const o = xrpTokenOffers[0];
               const getsValue = o.TakerGets?.value ? parseFloat(o.TakerGets.value) : parseFloat(o.TakerGets) / 1_000_000;
               const paysValue = o.TakerPays?.value ? parseFloat(o.TakerPays.value) : parseFloat(o.TakerPays) / 1_000_000;
               bestXrpToken = getsValue / paysValue;
          }
          const bestXrpTokenInverse = bestXrpToken > 0 ? 1 / bestXrpToken : 0;
          const spread = bestTokenXrp > 0 && bestXrpToken > 0 ? Math.abs(bestTokenXrp - bestXrpTokenInverse) : 0;
          const midPrice = bestTokenXrp > 0 && bestXrpToken > 0 ? (bestTokenXrp + bestXrpTokenInverse) / 2 : 0;
          const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
          return { spread, spreadPercent, bestTokenXrp, bestXrpToken };
     }

     private computeLiquidityRatio(tokenXrpOffers: any[], xrpTokenOffers: any[], isTokenXrp = true) {
          const sumVolume = (offers: any[]) => offers.reduce((sum, o) => sum + (o.TakerGets?.value ? parseFloat(o.TakerGets.value) : parseFloat(o.TakerGets) / 1_000_000), 0);
          const tokenVolume = tokenXrpOffers.length > 0 ? sumVolume(tokenXrpOffers) : 0;
          const xrpVolume = xrpTokenOffers.length > 0 ? sumVolume(xrpTokenOffers) : 0;
          const ratio = isTokenXrp ? (xrpVolume > 0 ? tokenVolume / xrpVolume : 0) : tokenVolume > 0 ? xrpVolume / tokenVolume : 0;
          return { tokenVolume, xrpVolume, ratio };
     }

     private computeAverageExchangeRateBothWays(offers: any[], tradeSizeXRP = 15) {
          let totalPays = 0;
          let totalGets = 0;
          const forwardRates: number[] = [];
          const inverseRates: number[] = [];
          let bestQuality = Infinity;

          for (const offer of offers) {
               const getsValue = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets?.value ?? '0');
               const paysValue = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays?.value ?? '0');
               if (getsValue > 0 && paysValue > 0) {
                    totalPays += paysValue;
                    totalGets += getsValue;
                    forwardRates.push(getsValue / paysValue);
                    inverseRates.push(paysValue / getsValue);
                    bestQuality = Math.min(bestQuality, paysValue / getsValue);
               }
          }

          const maxQuality = bestQuality * 1.05;
          let depthGets = 0;
          let depthPays = 0;
          for (const offer of offers) {
               const gv = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets?.value ?? '0');
               const pv = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays?.value ?? '0');
               if (pv / gv <= maxQuality) {
                    depthGets += gv;
                    depthPays += pv;
               }
          }

          let execGets = 0;
          let execPays = 0;
          let remainingPays = tradeSizeXRP;
          let insufficientLiquidity = false;
          for (const offer of offers) {
               const gv = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets?.value ?? '0');
               const pv = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays?.value ?? '0');
               const paysToUse = Math.min(remainingPays, pv);
               if (paysToUse > 0) {
                    execGets += (paysToUse / pv) * gv;
                    execPays += paysToUse;
                    remainingPays -= paysToUse;
               }
               if (remainingPays <= 0) break;
          }
          if (remainingPays > 0) insufficientLiquidity = true;

          const meanForward = forwardRates.length > 0 ? forwardRates.reduce((a, b) => a + b, 0) / forwardRates.length : 0;
          const varianceForward = forwardRates.length > 0 ? forwardRates.reduce((sum, r) => sum + Math.pow(r - meanForward, 2), 0) / forwardRates.length : 0;
          const stdDevForward = Math.sqrt(varianceForward);

          return {
               forward: {
                    vwap: totalPays > 0 ? totalGets / totalPays : 0,
                    simpleAvg: meanForward,
                    bestRate: forwardRates.length > 0 ? Math.max(...forwardRates) : 0,
                    worstRate: forwardRates.length > 0 ? Math.min(...forwardRates) : 0,
                    depthDOG: depthGets,
                    depthXRP: depthPays,
                    executionPrice: execPays > 0 ? execGets / execPays : 0,
                    executionDOG: execGets,
                    executionXRP: execPays,
                    insufficientLiquidity,
                    volatility: stdDevForward,
                    volatilityPercent: meanForward > 0 ? (stdDevForward / meanForward) * 100 : 0,
               },
               inverse: {
                    vwap: totalGets > 0 ? totalPays / totalGets : 0,
                    simpleAvg: inverseRates.length > 0 ? inverseRates.reduce((a, b) => a + b, 0) / inverseRates.length : 0,
                    bestRate: inverseRates.length > 0 ? Math.max(...inverseRates) : 0,
                    worstRate: inverseRates.length > 0 ? Math.min(...inverseRates) : 0,
               },
          };
     }
}
