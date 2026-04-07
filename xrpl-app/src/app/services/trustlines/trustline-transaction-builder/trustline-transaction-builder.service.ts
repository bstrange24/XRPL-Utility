import { inject, Injectable } from '@angular/core';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';

@Injectable({
     providedIn: 'root',
})
export class TrustlineTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);

     buildTrustSetTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, trustline: any, preparedConfig: any) {
          const trustlineAmount: xrpl.IssuedCurrencyAmount = {
               currency: this.utilsService.encodeIfNeeded(preparedConfig.currency.currency),
               issuer: preparedConfig.currency.issuer,
               value: preparedConfig.currency.amount.toString(),
          };

          const tx: xrpl.TrustSet = {
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: trustlineAmount,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (preparedConfig.trustline.trustlineFlags) tx.Flags = preparedConfig.trustline.trustlineFlags;

          return tx;
     }

     buildTrustSetRemoveTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, trustline: any, preparedConfig: any) {
          const trustlineAmount: xrpl.IssuedCurrencyAmount = {
               currency: this.utilsService.encodeIfNeeded(preparedConfig.currency.currency),
               issuer: preparedConfig.currency.issuer,
               value: '0',
          };

          const tx: xrpl.TrustSet = {
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: trustlineAmount,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (preparedConfig.trustline.trustlineFlags) tx.Flags = preparedConfig.trustline.trustlineFlags;

          return tx;
     }

     buildIssueCurrencyTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, trustline: any, preparedConfig: any) {
          const trustlineAmount: xrpl.IssuedCurrencyAmount = {
               currency: this.utilsService.encodeIfNeeded(preparedConfig.currency.currency),
               issuer: preparedConfig.currency.issuer,
               value: preparedConfig.currency.amount.toString(),
          };

          const tx: xrpl.Payment = {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: trustline.destination,
               Amount: trustlineAmount,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildClawbackTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, trustline: any, preparedConfig: any) {
          const trustlineAmount: xrpl.IssuedCurrencyAmount = {
               currency: this.utilsService.encodeIfNeeded(preparedConfig.currency.currency),
               issuer: trustline.destination,
               value: preparedConfig.currency.amount.toString(),
          };
          const tx: xrpl.Clawback = {
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: trustlineAmount,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
