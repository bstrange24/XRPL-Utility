import { inject, Injectable } from '@angular/core';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { MptStoreService } from '../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../mpt/mpt-util/mpt-util.service';

@Injectable({
     providedIn: 'root',
})
export class EscrowTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtilService = inject(MptUtilService);

     buildCreateEscrowTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, escrow: any, currency: any) {
          let amountToCash: any;
          const currencyCode = currency.currency || currency.currencyCode || AppConstants.XRP_CURRENCY;
          if (currencyCode === AppConstants.XRP_CURRENCY) {
               amountToCash = this.xrplTransactionService.buildSendMaxAmount('XRP', '', escrow.amount, false).sendMax;
          } else if (currencyCode === 'MPT') {
               const issuanceId = this.mptStoreService.mptIssuanceId();
               if (!issuanceId) throw new Error('Select an MPT before creating the escrow.');

               const issuance = this.mptStoreService.existingMpts().find(mpt => mpt.mpt_issuance_id === issuanceId);
               const assetScale = issuance?.AssetScale ?? this.mptStoreService.assetScaleCache().get(issuanceId) ?? 0;
               amountToCash = {
                    mpt_issuance_id: issuanceId,
                    value: this.mptUtilService.convertToBaseUnits(escrow.amount, assetScale),
               };
          } else {
               amountToCash = this.xrplTransactionService.buildAmount(currencyCode, escrow.amount, currency.issuer).amountToCash;
          }

          const tx: xrpl.EscrowCreate = {
               TransactionType: 'EscrowCreate',
               Account: wallet.address,
               Amount: amountToCash,
               Destination: escrow.destination,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (escrow.condition) tx.Condition = escrow.condition;

          if (escrow.enableEscrowFinishAfterExpirationDate && escrow.escrowFinishAfterExpirationDate) {
               const rippleTime = this.utilsService.toRippleTime(escrow.escrowFinishAfterExpirationDate);
               if (rippleTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('Escrow finish time must be in the future');
               }
               this.utilsService.setFinishAfter(tx, Number(rippleTime));
          }

          if (escrow.enableEscrowCancelAfterExpirationDate && escrow.escrowCancelAfterExpirationDate) {
               const rippleTime = this.utilsService.toRippleTime(escrow.escrowCancelAfterExpirationDate);
               if (rippleTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('Escrow cancel time must be in the future');
               }
               this.utilsService.setCancelAfter(tx, Number(rippleTime));
          }

          return tx;
     }

     buildFinishEscrowTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, escrow: any) {
          const tx: xrpl.EscrowFinish = {
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: escrow.escrowOwner,
               OfferSequence: escrow.escrowSequenceNumber,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (escrow.fulfillment) tx.Fulfillment = escrow.fulfillment;
          if (escrow.condition) tx.Condition = escrow.condition;
          if (escrow.fulfillment && escrow.condition) {
               const fulfillmentBytes = escrow.fulfillment.length / 2;
               const baseFee = Number(env.fee);
               const feeInDrops = baseFee * (33 + Math.ceil(fulfillmentBytes / 16));
               tx.Fee = feeInDrops.toString();
          }
          return tx;
     }

     buildCancelEscrowTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, escrow: any) {
          const tx: xrpl.EscrowCancel = {
               TransactionType: 'EscrowCancel',
               Account: wallet.classicAddress,
               Owner: escrow.escrowOwner,
               OfferSequence: escrow.escrowSequenceNumber,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
