import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { UtilsService } from '../../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class AccountDeleteTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildAccountDeleteTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, accountDelete: any, accountInfo: any): xrpl.AccountDelete {
          const tx: xrpl.AccountDelete = {
               TransactionType: 'AccountDelete',
               Account: wallet.classicAddress,
               Destination: accountDelete.destination,
               Sequence: accountInfo.result.account_data.Sequence,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
