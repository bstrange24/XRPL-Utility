import { inject, Injectable } from '@angular/core';
import { UtilsService } from '../../util-service/utils.service';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';

@Injectable({
  providedIn: 'root',
})
export class ChecksTransactionBuilderService {
   public readonly utilsService = inject(UtilsService);
   public readonly xrplTransactionService = inject(XrplTransactionService);
  
    buildCreateCheckTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, check: any) {
      let sendMax = this.xrplTransactionService.buildSendMaxAmount(check.currencyCode, check.currencyIssuer ?? '', check.amountField, false).sendMax;
      const tx: xrpl.CheckCreate = {
                  TransactionType: 'CheckCreate',
               Account: wallet.classicAddress,
               SendMax: sendMax,
               Destination: check.destination,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
             };

              if (check.enableExpirationDate && check.expiration) {
                    const rippleTime = this.utilsService.toRippleTime(check.expiration);
                    this.utilsService.setExpiration(tx, Number(rippleTime));
               }

             return tx;
        }

        buildCashCheckTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, check: any) {
                let sendMax = this.xrplTransactionService.buildSendMaxAmount(check.currencyCode, check.currencyIssuer ?? '', check.amountField, false).sendMax;
             const tx: xrpl.CheckCash = {
                 TransactionType: 'CheckCash',
               Account: wallet.classicAddress,
               Amount: sendMax,
               CheckID: check.checkId,
              Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
             }
             return tx;
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
