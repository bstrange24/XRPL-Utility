import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { UtilsService } from '../../util-service/utils.service';
import { WithImplicitCoercion } from 'node:buffer';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

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

     buildSetPermissionedDomainTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, permissionedDomain: any): xrpl.PermissionedDomainSet {
          const credentials = permissionedDomain.setAcceptedCredentials || [];

          const tx: xrpl.PermissionedDomainSet = {
               TransactionType: 'PermissionedDomainSet',
               Account: wallet.classicAddress,
               AcceptedCredentials: credentials.map((item: { issuer: any; credentialType: WithImplicitCoercion<string> }) => ({
                    Credential: {
                         Issuer: item.issuer,
                         CredentialType: Buffer.from(item.credentialType, 'utf8').toString('hex'),
                    },
               })),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // If editing existing domain → include DomainID
          if (permissionedDomain.domainMode === 'update' && permissionedDomain.domainId) {
               tx.DomainID = permissionedDomain.domainId;
          }

          return tx;
     }
}
