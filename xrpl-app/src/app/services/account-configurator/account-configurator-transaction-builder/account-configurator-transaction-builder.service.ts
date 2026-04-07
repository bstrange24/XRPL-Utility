import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildModifyAccountSetTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, config: any): xrpl.AccountSet {
          const tx: xrpl.AccountSet = {
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (config.enableNftMinter) {
               if (config.enableNftMinter === 'Y') {
                    tx.NFTokenMinter = config.account.nfTokenMinterAddress;
                    tx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               } else {
                    tx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               }
          }
          if (config.operation) {
               if (config.operation === 'SetFlag') {
                    tx.SetFlag = Number(config.flagValue);
               } else {
                    tx.ClearFlag = Number(config.flagValue);
               }
          }

          return tx;
     }

     buildModifyMultiSignTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, config: any): xrpl.SignerListSet {
          const tx: xrpl.SignerListSet = {
               TransactionType: 'SignerListSet',
               Account: wallet.classicAddress,
               SignerQuorum: 0,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          if (config.account.enableMultiSignFlag === 'Y') {
               tx.SignerEntries = config.account.formattedSignerEntries;
               tx.SignerQuorum = Number(config.account.signerQuorum);
          }
          return tx;
     }

     buildModifySetRegularKeyTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, config: any): xrpl.SetRegularKey {
          const tx: xrpl.SetRegularKey = {
               TransactionType: 'SetRegularKey',
               Account: wallet.classicAddress,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          if (config.enableRegularKeyFlag === 'Y') {
               tx.RegularKey = config.account.regularKeyAddress;
          }
          return tx;
     }

     buildModifyDepositAuthTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, config: any): xrpl.DepositPreauth {
          const tx: xrpl.DepositPreauth = {
               TransactionType: 'DepositPreauth',
               Account: wallet.classicAddress,
               [config.authorizeFlag === 'Y' ? 'Authorize' : 'Unauthorize']: config.destinationAddress,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
