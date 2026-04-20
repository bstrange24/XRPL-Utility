import { computed, inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class TicketsUtilService {
     public readonly txUiService = inject(TransactionUiService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     readonly createButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Ticket(s)';
          if (step === 'waiting_validation') return 'Create Ticket(s)';
          return this.txUiService.stepMessage();
     });

     readonly deleteButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Selected Ticket(s)';
          if (step === 'waiting_validation') return 'Delete Selected Ticket(s)';
          return this.txUiService.stepMessage();
     });

     getAllTicketsSelected(ticketArray: any, selectedTicketSequences: any) {
          return computed(() => {
               const all = ticketArray;
               const sel = selectedTicketSequences;
               return all.length > 0 && sel.length === all.length;
          });
     }

     convertToString(ticket: any) {
          return ticket.toString();
     }

     filterAccountObjectsByTypes(accountObjectsResponse: xrpl.AccountObjectsResponse, types: string[]): xrpl.AccountObjectsResponse {
          const filtered = (accountObjectsResponse.result.account_objects ?? []).filter((obj: any) => types.includes(obj.LedgerEntryType));
          return {
               ...accountObjectsResponse,
               result: {
                    ...accountObjectsResponse.result,
                    account_objects: filtered,
               },
          };
     }
}
