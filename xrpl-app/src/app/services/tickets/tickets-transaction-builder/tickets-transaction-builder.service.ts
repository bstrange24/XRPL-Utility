import { Injectable } from '@angular/core';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class TicketsTransactionBuilderService {
     buildCreateTicketTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, ticket: any, preparedConfig: any, txOptionsState: any): xrpl.TicketCreate {
          const tx: xrpl.TicketCreate = {
               TransactionType: 'TicketCreate',
               Account: wallet.classicAddress,
               TicketCount: Number.parseInt(txOptionsState.ticketCountField),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }

     buildDeleteTicketTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, ticket: any, preparedConfig: any, txOptionsState: any): xrpl.AccountSet {
          const tx: xrpl.AccountSet = {
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               TicketSequence: Number(ticket.ticketId),
               Sequence: 0,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
