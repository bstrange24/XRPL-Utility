import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { UtilsService } from '../../util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildSetPermissionedDomainTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, permissionedDomain: any) {
          const tx: xrpl.PermissionedDomainSet = {
               TransactionType: 'PermissionedDomainSet',
               Account: wallet.classicAddress,
               AcceptedCredentials: [
                    {
                         Credential: {
                              Issuer: permissionedDomain.credentialIssuer,
                              CredentialType: Buffer.from(permissionedDomain.credentialType, 'utf8').toString('hex'),
                         },
                    },
               ],
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }

     buildDeletePermissionedDomainTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, permissionedDomain: any) {
          const tx: xrpl.PermissionedDomainDelete = {
               TransactionType: 'PermissionedDomainDelete',
               Account: wallet.classicAddress,
               DomainID: permissionedDomain.selectedDomainId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
