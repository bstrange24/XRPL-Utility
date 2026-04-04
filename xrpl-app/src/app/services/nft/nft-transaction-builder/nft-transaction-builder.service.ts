import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';

@Injectable({
     providedIn: 'root',
})
export class NftTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);

     buildCreateNftTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any) {
          const tx: xrpl.NFTokenMint = {
               TransactionType: 'NFTokenMint',
               Account: wallet.classicAddress,
               NFTokenTaxon: parseInt(nft.taxon, 0),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (nft.amount) {
               tx.Amount = nft.amount;
          }

          if (nft.nftFlags) {
               tx.Flags = nft.nftFlags;
          }

          if (nft.initialURI) {
               tx.URI = xrpl.convertStringToHex(nft.initialURI);
          }

          if (nft.transferFee) {
               this.utilsService.setTransferFee(tx, nft.transferFee);
          }

          if (nft.destination) {
               tx.Destination = nft.destination;
          }

          if (nft.nfTokenMinterAddress) {
               tx.Issuer = nft.nfTokenMinterAddress;
          }

          if (nft.expiration) {
               const rippleTime = this.utilsService.toRippleTime(nft.expiration);
               if (rippleTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('NFT expiration time must be in the future');
               }
               this.utilsService.setExpiration(tx, Number(rippleTime));
          }

          return tx;
     }

     buildBurnNftTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any) {
          const tx: xrpl.NFTokenBurn = {
               TransactionType: 'NFTokenBurn',
               Account: wallet.classicAddress,
               NFTokenID: nft.nftId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildUpdateNftMetaDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any) {
          const tx: xrpl.NFTokenModify = {
               TransactionType: 'NFTokenModify',
               Account: wallet.classicAddress,
               NFTokenID: nft.nftId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (nft.nftOwnerAddress) {
               tx.Owner = nft.nftOwnerAddress;
          }

          if (nft.initialURI) {
               tx.URI = xrpl.convertStringToHex(nft.initialURI);
          }
          return tx;
     }

     buildBuyNftDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any) {
          const tx: xrpl.NFTokenAcceptOffer = {
               TransactionType: 'NFTokenAcceptOffer',
               Account: wallet.classicAddress,
               NFTokenSellOffer: nft.nftOfferId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildSellNftDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any, currency: any) {
          let sendMax;
          if (currency.currency !== 'XRP') {
               sendMax = this.xrplTransactionService.buildSendMaxAmount(currency.currencyCode, currency.currencyIssuer ?? '', nft.amount, false).sendMax;
          } else {
               sendMax = this.xrplTransactionService.buildSendMaxAmount('XRP', '', nft.amount, false).sendMax;
          }

          const tx: xrpl.NFTokenCreateOffer = {
               TransactionType: 'NFTokenCreateOffer',
               Account: wallet.classicAddress,
               NFTokenID: nft.nftId,
               Amount: sendMax,
               Fee: env.fee,
               Flags: 1,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (nft.expiration) {
               const rippleTime = this.utilsService.toRippleTime(nft.expiration);
               if (rippleTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('NFT expiration time must be in the future');
               }
               this.utilsService.setExpiration(tx, Number(rippleTime));
          }
          return tx;
     }

     buildBuyNftOfferDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any, currency: any) {
          let sendMax;
          if (currency.currency !== 'XRP') {
               sendMax = this.xrplTransactionService.buildSendMaxAmount(currency.currencyCode, currency.currencyIssuer ?? '', nft.amount, false).sendMax;
          } else {
               sendMax = this.xrplTransactionService.buildSendMaxAmount('XRP', '', nft.amount, false).sendMax;
          }

          const tx: xrpl.NFTokenAcceptOffer = {
               TransactionType: 'NFTokenAcceptOffer',
               Account: wallet.classicAddress,
               NFTokenSellOffer: nft.nftOfferId,
               Flags: 0,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildSellNftOfferDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any, currency: any) {
          let sendMax;
          if (currency.currency !== 'XRP') {
               sendMax = this.xrplTransactionService.buildSendMaxAmount(currency.currencyCode, currency.currencyIssuer ?? '', nft.amount, false).sendMax;
          } else {
               sendMax = this.xrplTransactionService.buildSendMaxAmount('XRP', '', nft.amount, false).sendMax;
          }

          const tx: xrpl.NFTokenAcceptOffer = {
               TransactionType: 'NFTokenAcceptOffer',
               Account: wallet.classicAddress,
               NFTokenSellOffer: nft.nftOfferId,
               Flags: 1,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildCancelNftOfferDataTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, nft: any) {
          const tx: xrpl.NFTokenCancelOffer = {
               TransactionType: 'NFTokenCancelOffer',
               Account: wallet.classicAddress,
               NFTokenOffers: [nft.nftOfferId],
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }
}
