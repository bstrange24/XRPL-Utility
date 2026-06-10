import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { OfferState } from '../offer-store/offer-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { OfferCreateFlags } from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class OfferTransactionBuilderService {
     private readonly utilsService = inject(UtilsService);

     toXRPLCurrency(currency: string, issuer: string): xrpl.Currency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer };
     }

     private toCurrencyAmount(currency: string, issuer: string, amount: string): string | xrpl.IssuedCurrencyAmount {
          if (currency === 'XRP') return xrpl.xrpToDrops(amount);
          return { currency: this.utilsService.encodeIfNeeded(currency), issuer, value: amount };
     }

     buildOfferCreateTx(wallet: xrpl.Wallet, offer: OfferState, env: any): xrpl.OfferCreate {
          let takerGets: string | xrpl.IssuedCurrencyAmount;
          let takerPays: string | xrpl.IssuedCurrencyAmount;

          console.log('Building offer with:', {
               weSpendCurrency: offer.weSpendCurrency,
               weSpendIssuer: offer.weSpendIssuer,
               weSpendAmount: offer.weSpendAmount,
               weWantCurrency: offer.weWantCurrency,
               weWantIssuer: offer.weWantIssuer,
               weWantAmount: offer.weWantAmount,
          });

          if (offer.weSpendCurrency === AppConstants.XRP_CURRENCY) {
               takerGets = xrpl.xrpToDrops(offer.weSpendAmount);
          } else {
               // Validate issuer is set for non-XRP currencies
               if (!offer.weSpendIssuer) {
                    throw new Error(`Issuer required for currency: ${offer.weSpendCurrency}`);
               }

               takerGets = {
                    currency: this.utilsService.encodeIfNeeded(offer.weSpendCurrency),
                    issuer: offer.weSpendIssuer,
                    value: offer.weSpendAmount,
               };
          }

          if (offer.weWantCurrency === AppConstants.XRP_CURRENCY) {
               takerPays = xrpl.xrpToDrops(offer.weWantAmount);
          } else {
               // Validate issuer is set for non-XRP currencies
               if (!offer.weWantIssuer) {
                    throw new Error(`Issuer required for currency: ${offer.weWantCurrency}`);
               }

               takerPays = {
                    currency: this.utilsService.encodeIfNeeded(offer.weWantCurrency),
                    issuer: offer.weWantIssuer,
                    value: offer.weWantAmount,
               };
          }

          let flags = 0;
          if (offer.isMarketOrder) {
               flags |= OfferCreateFlags.tfImmediateOrCancel;
          } else if (offer.isFillOrKill) {
               flags |= OfferCreateFlags.tfFillOrKill;
          } else if (offer.isPassive) {
               flags |= OfferCreateFlags.tfPassive;
          }

          return {
               TransactionType: 'OfferCreate',
               Account: wallet.classicAddress,
               TakerGets: takerGets,
               TakerPays: takerPays,
               Flags: flags,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildOfferCreateTx23(wallet: xrpl.Wallet, offer: OfferState, env: any): xrpl.OfferCreate {
          let takerGets: string | xrpl.IssuedCurrencyAmount;
          let takerPays: string | xrpl.IssuedCurrencyAmount;

          if (offer.weSpendCurrency === AppConstants.XRP_CURRENCY) {
               takerGets = xrpl.xrpToDrops(offer.weSpendAmount);
          } else {
               takerGets = {
                    currency: this.utilsService.encodeIfNeeded(offer.weSpendCurrency),
                    issuer: 'rhZmA5XVLvB2dRG3wadNgxHUc9JhfBpwUM', // offer.weSpendIssuer,
                    // issuer: offer.weSpendIssuer,
                    value: offer.weSpendAmount,
               };
          }

          if (offer.weWantCurrency === AppConstants.XRP_CURRENCY) {
               takerPays = xrpl.xrpToDrops(offer.weWantAmount);
          } else {
               takerPays = {
                    currency: this.utilsService.encodeIfNeeded(offer.weWantCurrency),
                    issuer: 'rhZmA5XVLvB2dRG3wadNgxHUc9JhfBpwUM', //offer.weWantIssuer,
                    // issuer: offer.weWantIssuer,
                    value: offer.weWantAmount,
               };
          }

          let flags = 0;
          if (offer.isMarketOrder) {
               flags |= OfferCreateFlags.tfImmediateOrCancel;
          } else if (offer.isFillOrKill) {
               flags |= OfferCreateFlags.tfFillOrKill;
          } else if (offer.isPassive) {
               flags |= OfferCreateFlags.tfPassive;
          }

          return {
               TransactionType: 'OfferCreate',
               Account: wallet.classicAddress,
               TakerGets: takerGets,
               TakerPays: takerPays,
               Flags: flags,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildOfferCancelTx(wallet: xrpl.Wallet, sequence: number, env: any): xrpl.OfferCancel {
          return {
               TransactionType: 'OfferCancel',
               Account: wallet.classicAddress,
               OfferSequence: sequence,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }
}
