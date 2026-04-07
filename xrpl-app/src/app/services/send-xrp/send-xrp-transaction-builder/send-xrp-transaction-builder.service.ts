import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { UtilsService } from '../../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class SendXrpTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildSendXrpTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, account: any) {
          const tx: xrpl.Payment = {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: account.destination,
               Amount: xrpl.xrpToDrops(account.amount.toString()),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
