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

     // Delegated TrustSet: the delegator's side of the line is modified, so the counterparty is the LimitAmount issuer and the existing limit is kept
     buildDelegatedTrustSetTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, trustline: any, limit: string) {
          const flagByAction: Record<string, number> = {
               authorize: xrpl.TrustSetFlags.tfSetfAuth,
               freeze: xrpl.TrustSetFlags.tfSetFreeze,
               unfreeze: xrpl.TrustSetFlags.tfClearFreeze,
          };

          const tx: xrpl.TrustSet = {
               TransactionType: 'TrustSet',
               Account: trustline.delegatorAddress.trim(),
               Delegate: wallet.classicAddress,
               LimitAmount: {
                    currency: this.utilsService.encodeIfNeeded(trustline.delegateCurrency.trim()),
                    issuer: trustline.delegateHolder.trim(),
                    value: limit,
               },
               Flags: flagByAction[trustline.delegateAction],
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

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
