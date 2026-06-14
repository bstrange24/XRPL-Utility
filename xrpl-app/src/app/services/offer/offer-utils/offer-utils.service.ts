import { computed, inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { OfferStoreService } from '../offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../offer-transaction-view-model/offer-transaction-view-model.service';
import * as xrpl from 'xrpl';
import BigNumber from 'bignumber.js';
import { AppConstants } from '../../../core/app.constants';
import { OfferCurrencyService } from '../offer-currency/offer-currency.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { ToastService } from '../../utils/toast/toast.service';

@Injectable({
     providedIn: 'root',
})
export class OfferUtilsService {
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly offerCurrency = inject(OfferCurrencyService);
     public readonly offerTransactionViewModelService = inject(OfferTransactionViewModelService);
     public readonly xrplService = inject(XrplService);
     public readonly toastService = inject(ToastService);
     private amountTimeout: ReturnType<typeof setTimeout> | null = null;
     private isUpdatingExchange = false;
     private isInternalUpdate = false;

     invertOrder(): void {
          // Prevent any recalculation during invert
          if (this.amountTimeout) {
               clearTimeout(this.amountTimeout);
               this.amountTimeout = null;
          }

          // Store current values
          const tempCurr = this.offerStoreService.weWantCurrency();
          const tempIss = this.offerStoreService.weWantIssuer();
          const tempAmt = this.offerStoreService.weWantAmount();

          const spendCurr = this.offerStoreService.weSpendCurrency();
          const spendIss = this.offerStoreService.weSpendIssuer();
          const spendAmt = this.offerStoreService.weSpendAmount();

          console.log('Invert - Before swap:', {
               weWant: { curr: tempCurr, iss: tempIss, amt: tempAmt },
               weSpend: { curr: spendCurr, iss: spendIss, amt: spendAmt },
          });

          // Swap values in store - do this synchronously
          this.offerStoreService.setField('weWantCurrency', spendCurr);
          this.offerStoreService.setField('weSpendCurrency', tempCurr);
          this.offerStoreService.setField('weWantIssuer', spendIss);
          this.offerStoreService.setField('weSpendIssuer', tempIss);
          this.offerStoreService.setField('weWantAmount', spendAmt);
          this.offerStoreService.setField('weSpendAmount', tempAmt || '');

          console.log('Invert - After swap:', {
               weWant: { curr: this.offerStoreService.weWantCurrency(), iss: this.offerStoreService.weWantIssuer(), amt: this.offerStoreService.weWantAmount() },
               weSpend: { curr: this.offerStoreService.weSpendCurrency(), iss: this.offerStoreService.weSpendIssuer(), amt: this.offerStoreService.weSpendAmount() },
          });

          const currentWallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();

          if (currentWallet) {
               // Update the OfferCurrency service without triggering additional refreshes
               // Use setTimeout to avoid blocking
               setTimeout(async () => {
                    try {
                         // Reset both sides first
                         await this.offerCurrency.selectWeWantCurrency('', currentWallet);
                         await this.offerCurrency.selectWeSpendCurrency('', currentWallet);

                         // Set new currencies
                         await this.offerCurrency.selectWeWantCurrency(spendCurr, currentWallet);
                         await this.offerCurrency.selectWeSpendCurrency(tempCurr, currentWallet);

                         // Handle issuers - only set if currency is not XRP
                         if (spendCurr !== 'XRP' && spendIss) {
                              await this.offerCurrency.selectWeWantIssuer(spendIss, currentWallet);
                         }
                         if (tempCurr !== 'XRP' && tempIss) {
                              await this.offerCurrency.selectWeSpendIssuer(tempIss, currentWallet);
                         }

                         console.log('Invert completed successfully');
                    } catch (error) {
                         console.error('Error during invert currency update:', error);
                    }
               }, 0);
          }
     }

     getExistingOffers(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): any[] {
          const objects = accountObjects.result?.account_objects ?? accountObjects.result.account_objects ?? [];
          const offers = objects.filter((obj: any) => obj.LedgerEntryType === 'Offer' && obj.Account === classicAddress);

          const mapped = offers.map((obj: any): any => {
               let takerGetsUI: string = '';
               let takerPaysUI: string = '';

               const tg = obj.TakerGets;
               const tp = obj.TakerPays;

               if (typeof tg === 'string') {
                    takerGetsUI = String(xrpl.dropsToXrp(tg));
               } else if (tg?.value) {
                    const currency = this.utilsService.normalizeCurrencyCode(tg.currency);
                    takerGetsUI = `${tg.value} ${currency} ${tg.issuer || ''}`;
               }

               if (typeof tp === 'string') {
                    takerPaysUI = String(xrpl.dropsToXrp(tp));
               } else if (tp?.value) {
                    const currency = this.utilsService.normalizeCurrencyCode(tp.currency);
                    takerPaysUI = `${tp.value} ${currency} ${tp.issuer || ''}`;
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
          if (!client || !wallet) {
               console.warn('Cannot fetch order book: missing client or wallet');
               return;
          }

          this.txUiService.clearAllOptionsAndMessages();

          try {
               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               console.log(`fetchOrderBook - weWantCurr: ${weWantCurr}, weSpendCurr: ${weSpendCurr}`);

               // Don't fetch if both currencies are the same (invalid market)
               if (weWantCurr === weSpendCurr) {
                    console.warn('Cannot fetch order book for same currency pair');
                    this.offerStoreService.setField('orderBookStats', this.getEmptyStats());
                    this.offerStoreService.setField('orderBookPair', '');
                    return;
               }

               if (!weWantCurr || !weSpendCurr) {
                    this.offerStoreService.setField('orderBookStats', this.getEmptyStats());
                    this.offerStoreService.setField('orderBookPair', '');
                    return;
               }

               // FIXED: Proper issuer handling
               const we_want: any =
                    weWantCurr === AppConstants.XRP_CURRENCY
                         ? { currency: 'XRP' }
                         : {
                                currency: this.utilsService.encodeIfNeeded(weWantCurr),
                                issuer: this.offerStoreService.weWantIssuer() || 'rKi74C4ucJZmwactLkVMjM2JxsMYruSvpm',
                           };

               const we_spend: any =
                    weSpendCurr === AppConstants.XRP_CURRENCY
                         ? { currency: 'XRP' }
                         : {
                                currency: this.utilsService.encodeIfNeeded(weSpendCurr),
                                issuer: this.offerStoreService.weSpendIssuer(),
                           };

               console.log(`we_want: ${JSON.stringify(we_want)}, we_spend: ${JSON.stringify(we_spend)}`);

               // Add value only if provided
               if (this.offerStoreService.weWantAmount()) {
                    we_want.value = this.offerStoreService.weWantAmount();
               }
               if (this.offerStoreService.weSpendAmount()) {
                    we_spend.value = this.offerStoreService.weSpendAmount();
               }

               const displayWeWant = this.utilsService.decodeIfNeeded(we_want.currency);
               const displayWeSpend = this.utilsService.decodeIfNeeded(we_spend.currency);

               const [orderBook] = await Promise.all([
                    client.request({
                         command: 'book_offers',
                         taker: wallet.classicAddress,
                         ledger_index: 'current',
                         taker_gets: we_want,
                         taker_pays: we_spend,
                         limit: 200,
                    }),
                    client.request({
                         command: 'book_offers',
                         taker: wallet.classicAddress,
                         ledger_index: 'current',
                         taker_gets: we_spend,
                         taker_pays: we_want,
                         limit: 200,
                    }),
               ]);

               const combinedOffers = [...(orderBook.result.offers || [])];
               const pair = `${displayWeWant}/${displayWeSpend}`;

               this.offerStoreService.setField('orderBookPair', pair);
               this.offerStoreService.setField('orderBookStats', {
                    vwap: '0',
                    simpleAvg: '0',
                    bestRate: '0',
                    spread: '0',
                    spreadPercent: '0',
                    liquidityRatio: '0',
                    depth: 'N/A',
                    execution: 'N/A',
                    volatility: 'N/A',
               });

               if (combinedOffers.length > 0) {
                    const stats = this.computeAverageExchangeRateBothWays(combinedOffers, 15);
                    if (stats) {
                         this.offerStoreService.setField('orderBookStats', {
                              vwap: stats.forward?.vwap?.toFixed(8) || '0',
                              simpleAvg: stats.forward?.simpleAvg?.toFixed(8) || '0',
                              bestRate: stats.forward?.bestRate?.toFixed(8) || '0',
                              spread: '0',
                              spreadPercent: '0',
                              liquidityRatio: '0',
                              depth: `${stats.forward?.depthToken?.toFixed(2) || '0'} ${displayWeWant} for ${stats.forward?.depthXRP?.toFixed(2) || '0'} ${displayWeSpend}`,
                              execution: stats.forward?.insufficientLiquidity ? `Insufficient liquidity` : `Receive ${stats.forward?.executionPriceToken?.toFixed(2) || '0'} ${displayWeWant} for 15 ${displayWeSpend}`,
                              volatility: `${stats.forward?.volatility?.toFixed(8) || '0'} (${stats.forward?.volatilityPercent?.toFixed(2) || '0'}%)`,
                         });
                    }
               }
          } catch (error: any) {
               console.error('Error in fetchOrderBook:', error);
               // Don't show error toast for "No such market" - it's expected for some pairs
               if (!error.message?.includes('No such market')) {
                    this.toastService.error(error.message || 'Failed to fetch order book', AppConstants.TOAST.ERROR);
               }
               this.offerStoreService.setField('orderBookStats', this.getEmptyStats());
          }
     }

     private getEmptyStats() {
          return {
               vwap: '0',
               simpleAvg: '0',
               bestRate: '0',
               spread: '0',
               spreadPercent: '0',
               liquidityRatio: '0',
               depth: 'N/A',
               execution: 'N/A',
               volatility: 'N/A',
          };
     }

     onWeSpendAmountChange(): void {
          if (this.isInternalUpdate) return;
          if (this.amountTimeout) clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => this.calculateFromSpend(), 500);
     }

     onWeWantAmountChange(): void {
          if (this.isInternalUpdate) return;
          if (this.amountTimeout) clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => this.calculateFromWant(), 500);
     }

     private async calculateFromSpend(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const weSpendAmt = this.offerStoreService.weSpendAmount();
          if (!weSpendAmt || Number.parseFloat(weSpendAmt) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          const weSpendCurr = this.offerStoreService.weSpendCurrency();
          const weWantCurr = this.offerStoreService.weWantCurrency();

          if (weSpendCurr === 'XRP' && weWantCurr !== 'XRP') {
               await this.updateTokenBalanceAndExchange(); // spend XRP → want token
          } else if (weSpendCurr !== 'XRP' && weWantCurr === 'XRP') {
               await this.calculateSpendTokenForXRP(); // spend token → want XRP
          } else {
               await this.updateTokenBalanceAndExchange(); // both non‑XRP or both XRP (invalid pair)
          }
     }

     private async calculateFromWant(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const weWantAmt = this.offerStoreService.weWantAmount();
          if (!weWantAmt || Number.parseFloat(weWantAmt) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          const weSpendCurr = this.offerStoreService.weSpendCurrency();
          const weWantCurr = this.offerStoreService.weWantCurrency();

          if (weWantCurr === 'XRP' && weSpendCurr !== 'XRP') {
               await this.updateTokenBalanceAndExchangeReverse(); // want XRP → spend token
          } else if (weWantCurr !== 'XRP' && weSpendCurr === 'XRP') {
               await this.calculateWantTokenForXRP(); // want token → spend XRP
          } else {
               await this.updateTokenBalanceAndExchangeReverse(); // both non‑XRP or both XRP
          }
     }

     private async calculateSpendTokenForXRP(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const spendAmount = this.offerStoreService.weSpendAmount();
          if (!spendAmount || Number.parseFloat(spendAmount) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          this.isUpdatingExchange = true;

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();
               const weSpendIssuer = this.offerStoreService.weSpendIssuer();

               const takerGets =
                    weWantCurr === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: weWantCurr,
                                issuer: this.offerStoreService.weWantIssuer(),
                                value: '0',
                           };

               const takerPays =
                    weSpendCurr === 'XRP'
                         ? { currency: 'XRP', value: spendAmount }
                         : {
                                currency: weSpendCurr,
                                issuer: weSpendIssuer,
                                value: spendAmount,
                           };

               const client = await this.getClient();
               if (!client) return;

               const orderBook = await client.request({
                    command: 'book_offers',
                    taker_gets: takerGets,
                    taker_pays: takerPays,
                    limit: 400,
                    ledger_index: 'current',
                    taker: wallet.classicAddress,
               });

               const allOffers = orderBook.result.offers || [];

               if (allOffers.length === 0) {
                    this.isInternalUpdate = true;
                    this.offerStoreService.setField('weWantAmount', '0');
                    this.isInternalUpdate = false;
                    return;
               }

               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.utilsService.normalizeAmount(a.TakerGets)).dividedBy(this.utilsService.normalizeAmount(a.TakerPays));
                    const rateB = new BigNumber(this.utilsService.normalizeAmount(b.TakerGets)).dividedBy(this.utilsService.normalizeAmount(b.TakerPays));
                    return rateA.minus(rateB).toNumber();
               });

               let remainingSpend = new BigNumber(spendAmount);
               let totalReceived = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remainingSpend.lte(0)) break;

                    const pays = new BigNumber(this.utilsService.normalizeAmount(offer.TakerPays));
                    const gets = new BigNumber(this.utilsService.normalizeAmount(offer.TakerGets));

                    if (pays.isZero()) continue;

                    const useSpend = BigNumber.min(remainingSpend, pays);
                    const received = useSpend.multipliedBy(gets).dividedBy(pays);
                    totalReceived = totalReceived.plus(received);
                    remainingSpend = remainingSpend.minus(useSpend);
               }

               const roundedAmount = this.utilsService.roundAmount(totalReceived.toNumber(), weWantCurr, 6);

               // Use internal update flag to prevent circular calculation
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', roundedAmount);
               this.isInternalUpdate = false;

               this.offerStoreService.setField('insufficientLiquidityWarning', remainingSpend.gt(0));
          } catch (error) {
               console.error('Error in calculateSpendTokenForXRP:', error);
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', '0');
               this.isInternalUpdate = false;
          } finally {
               this.isUpdatingExchange = false;
          }
     }

     private async calculateWantTokenForXRP(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const wantAmount = this.offerStoreService.weWantAmount();
          if (!wantAmount || Number.parseFloat(wantAmount) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          this.isUpdatingExchange = true;

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();
               const weWantIssuer = this.offerStoreService.weWantIssuer();

               const takerGets =
                    weWantCurr === 'XRP'
                         ? { currency: 'XRP', value: wantAmount }
                         : {
                                currency: weWantCurr,
                                issuer: weWantIssuer,
                                value: wantAmount,
                           };

               const takerPays =
                    weSpendCurr === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: weSpendCurr,
                                issuer: this.offerStoreService.weSpendIssuer(),
                                value: '0',
                           };

               const client = await this.getClient();
               if (!client) return;

               const orderBook = await client.request({
                    command: 'book_offers',
                    taker_gets: takerGets,
                    taker_pays: takerPays,
                    limit: 400,
                    ledger_index: 'current',
                    taker: wallet.classicAddress,
               });

               const allOffers = orderBook.result.offers || [];

               if (allOffers.length === 0) {
                    this.isInternalUpdate = true;
                    this.offerStoreService.setField('weSpendAmount', '0');
                    this.isInternalUpdate = false;
                    return;
               }

               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.utilsService.normalizeAmount(a.TakerPays)).dividedBy(this.utilsService.normalizeAmount(a.TakerGets));
                    const rateB = new BigNumber(this.utilsService.normalizeAmount(b.TakerPays)).dividedBy(this.utilsService.normalizeAmount(b.TakerGets));
                    return rateA.minus(rateB).toNumber();
               });

               let remainingReceive = new BigNumber(wantAmount);
               let totalPay = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remainingReceive.lte(0)) break;

                    const availableReceive = new BigNumber(this.utilsService.normalizeAmount(offer.TakerGets));
                    const payForThis = new BigNumber(this.utilsService.normalizeAmount(offer.TakerPays));

                    if (availableReceive.isZero()) continue;

                    const rate = payForThis.dividedBy(availableReceive);
                    const useReceive = BigNumber.min(remainingReceive, availableReceive);
                    const requiredPay = useReceive.multipliedBy(rate);
                    totalPay = totalPay.plus(requiredPay);
                    remainingReceive = remainingReceive.minus(useReceive);
               }

               const roundedAmount = this.utilsService.roundAmount(totalPay.toNumber(), weSpendCurr, 6);

               // Use internal update flag to prevent circular calculation
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', roundedAmount);
               this.isInternalUpdate = false;

               this.offerStoreService.setField('insufficientLiquidityWarning', remainingReceive.gt(0));
          } catch (error) {
               console.error('Error in calculateWantTokenForXRP:', error);
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
          } finally {
               this.isUpdatingExchange = false;
          }
     }

     async updateTokenBalanceAndExchange(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const weSpendAmt = this.offerStoreService.weSpendAmount();
          if (!weSpendAmt || Number.parseFloat(weSpendAmt) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          this.isUpdatingExchange = true;

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               if (!weWantCurr || !weSpendCurr) return;

               const weWant: any =
                    weWantCurr === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: weWantCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weWantCurr) : weWantCurr,
                                issuer: this.offerStoreService.weWantIssuer(),
                                value: '0',
                           };

               const weSpend: any =
                    weSpendCurr === 'XRP'
                         ? { currency: 'XRP', value: weSpendAmt }
                         : {
                                currency: weSpendCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weSpendCurr) : weSpendCurr,
                                issuer: this.offerStoreService.weSpendIssuer(),
                                value: weSpendAmt,
                           };

               const client = await this.getClient();
               if (!client) return;

               const orderBook = await client.request({
                    command: 'book_offers',
                    taker_gets: weWant,
                    taker_pays: weSpend,
                    limit: 400,
                    ledger_index: 'current',
                    taker: wallet.classicAddress,
               });

               const allOffers = orderBook.result.offers || [];

               if (allOffers.length === 0) {
                    this.offerStoreService.setField('weWantAmount', '0');
                    return;
               }

               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.utilsService.normalizeAmount(a.TakerGets)).dividedBy(this.utilsService.normalizeAmount(a.TakerPays));
                    const rateB = new BigNumber(this.utilsService.normalizeAmount(b.TakerGets)).dividedBy(this.utilsService.normalizeAmount(b.TakerPays));
                    return rateA.minus(rateB).toNumber();
               });

               let remaining = new BigNumber(weSpendAmt);
               let totalReceived = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remaining.lte(0)) break;

                    const pays = new BigNumber(this.utilsService.normalizeAmount(offer.TakerPays));
                    const gets = new BigNumber(this.utilsService.normalizeAmount(offer.TakerGets));

                    if (pays.isZero()) continue;

                    const use = BigNumber.min(remaining, pays);
                    const received = use.multipliedBy(gets).dividedBy(pays);
                    totalReceived = totalReceived.plus(received);
                    remaining = remaining.minus(use);
               }

               // Round based on currency type
               const roundedAmount = this.utilsService.roundAmount(totalReceived.toNumber(), weWantCurr, 6);

               this.isInternalUpdate = true;
               this.offerStoreService.setField('weWantAmount', roundedAmount);
               this.isInternalUpdate = false;
               this.offerStoreService.setField('insufficientLiquidityWarning', remaining.gt(0));
          } catch (error: any) {
               console.error('Error in calculateWantTokenForXRP:', error);
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
          } finally {
               this.isUpdatingExchange = false;
          }
     }

     async updateTokenBalanceAndExchangeReverse(): Promise<void> {
          if (this.isUpdatingExchange) return;

          const weWantAmt = this.offerStoreService.weWantAmount();
          if (!weWantAmt || Number.parseFloat(weWantAmt) <= 0) {
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
               return;
          }

          this.isUpdatingExchange = true;

          try {
               const wallet = this.offerTransactionViewModelService.walletManagerService.getSelectedWallet();
               if (!wallet) return;

               const weWantCurr = this.offerStoreService.weWantCurrency();
               const weSpendCurr = this.offerStoreService.weSpendCurrency();

               if (!weWantCurr || !weSpendCurr) return;

               const weWant: any =
                    weWantCurr === 'XRP'
                         ? { currency: 'XRP', value: weWantAmt }
                         : {
                                currency: weWantCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weWantCurr) : weWantCurr,
                                issuer: this.offerStoreService.weWantIssuer(),
                                value: weWantAmt,
                           };

               const weSpend: any =
                    weSpendCurr === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: weSpendCurr.length > 3 ? this.utilsService.encodeCurrencyCode(weSpendCurr) : weSpendCurr,
                                issuer: this.offerStoreService.weSpendIssuer(),
                                value: '0',
                           };

               const client = await this.getClient();
               if (!client) return;

               const orderBook = await client.request({
                    command: 'book_offers',
                    taker_gets: weWant,
                    taker_pays: weSpend,
                    limit: 400,
                    ledger_index: 'current',
                    taker: wallet.classicAddress,
               });

               const allOffers = orderBook.result.offers || [];

               if (allOffers.length === 0) {
                    this.offerStoreService.setField('weSpendAmount', '0');
                    return;
               }

               allOffers.sort((a: any, b: any) => {
                    const rateA = new BigNumber(this.utilsService.normalizeAmount(a.TakerPays)).dividedBy(this.utilsService.normalizeAmount(a.TakerGets));
                    const rateB = new BigNumber(this.utilsService.normalizeAmount(b.TakerPays)).dividedBy(this.utilsService.normalizeAmount(b.TakerGets));
                    return rateA.minus(rateB).toNumber();
               });

               let remainingReceive = new BigNumber(weWantAmt);
               let totalPay = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remainingReceive.lte(0)) break;

                    const availableReceive = new BigNumber(this.utilsService.normalizeAmount(offer.TakerGets));
                    const payForThis = new BigNumber(this.utilsService.normalizeAmount(offer.TakerPays));

                    if (availableReceive.isZero()) continue;

                    const rate = payForThis.dividedBy(availableReceive);
                    const useReceive = BigNumber.min(remainingReceive, availableReceive);
                    const requiredPay = useReceive.multipliedBy(rate);
                    totalPay = totalPay.plus(requiredPay);
                    remainingReceive = remainingReceive.minus(useReceive);
               }

               // Round based on currency type
               const roundedAmount = this.utilsService.roundAmount(totalPay.toNumber(), weSpendCurr, 6);

               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', roundedAmount);
               this.isInternalUpdate = false;
               this.offerStoreService.setField('insufficientLiquidityWarning', remainingReceive.gt(0));
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchangeReverse:', error);
               this.isInternalUpdate = true;
               this.offerStoreService.setField('weSpendAmount', '0');
               this.isInternalUpdate = false;
          } finally {
               this.isUpdatingExchange = false;
          }
     }

     private async getClient(): Promise<xrpl.Client | null> {
          try {
               return await this.xrplService.getClient();
          } catch {
               return null;
          }
     }

     private computeBidAskSpread(tokenXrpOffers: any[], xrpTokenOffers: any[]) {
          let bestTokenXrp = 0;
          if (tokenXrpOffers.length > 0) {
               const o = tokenXrpOffers[0];
               const getsValue = o.TakerGets?.value ? Number.parseFloat(o.TakerGets.value) : Number.parseFloat(o.TakerGets) / 1_000_000;
               const paysValue = o.TakerPays?.value ? Number.parseFloat(o.TakerPays.value) : Number.parseFloat(o.TakerPays) / 1_000_000;
               bestTokenXrp = getsValue / paysValue;
          }
          let bestXrpToken = 0;
          if (xrpTokenOffers.length > 0) {
               const o = xrpTokenOffers[0];
               const getsValue = o.TakerGets?.value ? Number.parseFloat(o.TakerGets.value) : Number.parseFloat(o.TakerGets) / 1_000_000;
               const paysValue = o.TakerPays?.value ? Number.parseFloat(o.TakerPays.value) : Number.parseFloat(o.TakerPays) / 1_000_000;
               bestXrpToken = getsValue / paysValue;
          }
          const bestXrpTokenInverse = bestXrpToken > 0 ? 1 / bestXrpToken : 0;
          const spread = bestTokenXrp > 0 && bestXrpToken > 0 ? Math.abs(bestTokenXrp - bestXrpTokenInverse) : 0;
          const midPrice = bestTokenXrp > 0 && bestXrpToken > 0 ? (bestTokenXrp + bestXrpTokenInverse) / 2 : 0;
          const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
          return { spread, spreadPercent, bestTokenXrp, bestXrpToken };
     }

     private computeAverageExchangeRateBothWays(offers: any[], tradeSizeXRP = 15) {
          let totalPays = 0;
          let totalGets = 0;
          const forwardRates: number[] = [];
          const inverseRates: number[] = [];
          let bestQuality = Infinity;

          for (const offer of offers) {
               const getsValue = typeof offer.TakerGets === 'string' ? Number.parseFloat(offer.TakerGets) / 1_000_000 : Number.parseFloat(offer.TakerGets?.value ?? '0');
               const paysValue = typeof offer.TakerPays === 'string' ? Number.parseFloat(offer.TakerPays) / 1_000_000 : Number.parseFloat(offer.TakerPays?.value ?? '0');
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
               const gv = typeof offer.TakerGets === 'string' ? Number.parseFloat(offer.TakerGets) / 1_000_000 : Number.parseFloat(offer.TakerGets?.value ?? '0');
               const pv = typeof offer.TakerPays === 'string' ? Number.parseFloat(offer.TakerPays) / 1_000_000 : Number.parseFloat(offer.TakerPays?.value ?? '0');
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
               const gv = typeof offer.TakerGets === 'string' ? Number.parseFloat(offer.TakerGets) / 1_000_000 : Number.parseFloat(offer.TakerGets?.value ?? '0');
               const pv = typeof offer.TakerPays === 'string' ? Number.parseFloat(offer.TakerPays) / 1_000_000 : Number.parseFloat(offer.TakerPays?.value ?? '0');
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
                    depthToken: depthGets,
                    depthXRP: depthPays,
                    executionPrice: execPays > 0 ? execGets / execPays : 0,
                    executionPriceToken: execGets,
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

     canCreateOffer = computed(() => {
          const weWantAmount = this.offerStoreService.weWantAmount() ?? '';
          const weSpendAmount = this.offerStoreService.weSpendAmount() ?? '';
          return weWantAmount.trim().length > 0 && weSpendAmount.trim().length > 0 && Number.parseFloat(weWantAmount) > 0 && Number.parseFloat(weSpendAmount) > 0;
     });

     canCancelOffer = computed(() => {
          const selected = this.offerStoreService.selectedOffersToCancel?.();
          return selected && selected.length > 0;
     });

     setIsUpdatingExchange(value: boolean): void {
          this.isUpdatingExchange = value;
     }

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
                    return 'btn-primary';
               case 'getOrderBook':
                    return 'btn-primary';
               case 'cancelOffer':
                    return 'btn-red';
               default:
                    return 'btn-blue';
          }
     });

     clearInputFields(): void {
          this.offerStoreService.resetOfferFields();
          if (this.amountTimeout) {
               clearTimeout(this.amountTimeout);
               this.amountTimeout = null;
          }
     }
}
