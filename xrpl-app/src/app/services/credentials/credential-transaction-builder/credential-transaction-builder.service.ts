import { inject, Injectable } from '@angular/core';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class CredentialTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildCreateCredentialTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, credential: any, preparedConfig: any): xrpl.CredentialCreate {
          const tx: xrpl.CredentialCreate = {
               TransactionType: 'CredentialCreate',
               Account: wallet.classicAddress,
               Subject: credential.subject,
               CredentialType: Buffer.from(credential.credentialType, 'utf8').toString('hex'),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (preparedConfig?.expirationDate && credential.expirationDate) {
               tx.Expiration = Number.parseInt(preparedConfig.expirationDate);
          }

          if (preparedConfig?.uri && credential.uri) {
               this.utilsService.setURI(tx, credential.uri);
          }

          return tx;
     }

     buildAcceptCredentialTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, credential: any, preparedConfig: any): xrpl.CredentialAccept {
          const tx: xrpl.CredentialAccept = {
               TransactionType: 'CredentialAccept',
               Account: wallet.classicAddress,
               Issuer: preparedConfig.credentialIssuer,
               CredentialType: Buffer.from(credential.credentialType, 'utf8').toString('hex'),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }

     buildDeleteCredentialTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, credential: any): xrpl.CredentialDelete {
          const tx: xrpl.CredentialDelete = {
               TransactionType: 'CredentialDelete',
               Account: wallet.classicAddress,
               Subject: credential.subject,
               CredentialType: Buffer.from(credential.credentialType, 'utf8').toString('hex'),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
