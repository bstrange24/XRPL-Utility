import { inject, Injectable } from '@angular/core';
import { UtilsService } from '../../util-service/utils.service';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';

@Injectable({
     providedIn: 'root',
})
export class ChecksTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);

     buildCreateCheckTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, check: any, currency: any) {
          let sendMax;
          if (currency.currency !== 'XRP') {
               sendMax = this.xrplTransactionService.buildSendMaxAmount(currency.currencyCode, currency.currencyIssuer ?? '', check.amount, false).sendMax;
          } else {
               sendMax = this.xrplTransactionService.buildSendMaxAmount('XRP', '', check.amount, false).sendMax;
          }

          const tx: xrpl.CheckCreate = {
               TransactionType: 'CheckCreate',
               Account: wallet.classicAddress,
               SendMax: sendMax,
               Destination: check.destination,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (check.enableExpirationDate && check.checkExpirationDate) {
               const rippleTime = this.utilsService.toRippleTime(check.checkExpirationDate);
               if (rippleTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('Check expiration time must be in the future');
               }
               this.utilsService.setExpiration(tx, Number(rippleTime));
          }

          return tx;
     }

     buildCashCheckTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, check: any, currency: any, trustline: any) {
          let sendMax;
          if (currency.currencyCode !== 'XRP') {
               sendMax = this.xrplTransactionService.buildSendMaxAmount(currency.currencyCode, currency.currencyIssuer ?? '', check.amount, false).sendMax;
          } else {
               sendMax = this.xrplTransactionService.buildSendMaxAmount('XRP', '', check.amount, false).sendMax;
          }

          const base: any = {
               TransactionType: 'CheckCash',
               Account: wallet.classicAddress,
               CheckID: check.checkIdField,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (check.useDeliverMin) {
               base.DeliverMin = sendMax;
          } else {
               base.Amount = sendMax;
          }

          return base as xrpl.CheckCash;
     }

     buildCancelCheckTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, check: any) {
          const tx: xrpl.CheckCancel = {
               TransactionType: 'CheckCancel',
               Account: wallet.classicAddress,
               CheckID: check.checkIdField,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }
}
