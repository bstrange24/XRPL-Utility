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
}
