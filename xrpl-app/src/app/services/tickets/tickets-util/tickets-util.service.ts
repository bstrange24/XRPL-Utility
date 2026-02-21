import { computed, inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

@Injectable({
     providedIn: 'root',
})
export class TicketsUtilService {
     public readonly txUiService = inject(TransactionUiService);

     readonly createButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Ticket(s)';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly deleteButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Selected Ticket(s)';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     getTransactionValues() {
          const amount = this.txUiService.amountField();
          const isSimulate = this.txUiService.isSimulateEnabled();
          const useMultiSign = this.txUiService.useMultiSign();
          const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
          const regularKeyAddress = this.txUiService.regularKeyAddress();
          const regularKeySeed = this.txUiService.regularKeySeed();
          const multiSignAddress = this.txUiService.multiSignAddress();
          const multiSignSeeds = this.txUiService.multiSignSeeds();
          return { amount, isSimulate, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds };
     }

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
}
