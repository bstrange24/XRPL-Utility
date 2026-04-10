import { inject, Injectable } from '@angular/core';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import * as xrpl from 'xrpl';
import didSchema from '../../../components/did/did-schema.json';
import { DidUtilService } from '../did-util/did-util.service';

@Injectable({
     providedIn: 'root',
})
export class DidTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly didUtilService = inject(DidUtilService);

     buildDidSetTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, did: any): xrpl.DIDSet {
          const tx: xrpl.DIDSet = {
               TransactionType: 'DIDSet',
               Account: wallet.classicAddress,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (did.didDocumentData) tx.DIDDocument = this.didUtilService.jsonToHex(did.didDocumentData);
          if (did.uriData) tx.URI = this.didUtilService.jsonToHex(did.uriData);
          if (did.didData) {
               const result = this.didUtilService.validateAndConvertDidJson(did.didData, didSchema);
               if (!result.success) throw new Error(result.errors ?? 'Invalid DID data');
               tx.Data = result.hexData;
          }

          return tx;
     }

     buildDidDeleteTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult): xrpl.DIDDelete {
          const tx: xrpl.DIDDelete = {
               TransactionType: 'DIDDelete',
               Account: wallet.classicAddress,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
