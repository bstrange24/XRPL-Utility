import { inject, Injectable } from '@angular/core';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class DelegateTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);

     buildDelegateTx(wallet: any, env: any, delegate: any, account: any, txOptions: any) {
          const tx: xrpl.DelegateSet = {
               TransactionType: 'DelegateSet',
               Account: wallet.address,
               Authorize: delegate.ticketCountField,
               Permissions: [],
          };
          return tx;
     }
}
