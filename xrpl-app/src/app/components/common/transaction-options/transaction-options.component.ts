import { Component, computed, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';
import { SelectSearchDropdownComponent } from '../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-transaction-options',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './transaction-options.component.html',
     styleUrl: './transaction-options.component.css',
})
export class TransactionOptionsComponent {
     public txUiService = inject(TransactionUiService);
     private utilsService = inject(UtilsService);
     Array = Array;

     // Inputs from parent
     @Input() activeTab?: () => string;
     @Input() showWhenTab: string | string[] = '*'; // '*' = always show
     @Input() multiSigningEnabled = signal(false);
     @Input() regularKeySigningEnabled = signal(false);
     @Input() showMemo = true;
     @Input() showMultiSign = true;
     @Input() showRegularKey = true;
     @Input() showTicket = true;
     @Input() showSimulate = true;

     // Direct access to service signals (correct way)
     isMemoEnabled = this.txUiService.isMemoEnabled;
     useMultiSign = this.txUiService.useMultiSign;
     isRegularKeyAddress = this.txUiService.isRegularKeyAddress;
     isTicket = this.txUiService.isTicket;
     memoField = this.txUiService.memoField;
     multiSignAddress = this.txUiService.multiSignAddress;
     multiSignSeeds = this.txUiService.multiSignSeeds;
     signerQuorum = this.txUiService.signerQuorum;
     regularKeyAddress = this.txUiService.regularKeyAddress;
     regularKeySeed = this.txUiService.regularKeySeed;
     selectedSingleTicket = this.txUiService.selectedSingleTicket;
     selectedTickets = this.txUiService.selectedTickets;
     multiSelectMode = this.txUiService.multiSelectMode;
     ticketArray = this.txUiService.ticketArray;

     ticketItems = computed(() => {
          return this.ticketArray().map(ticket => ({
               id: ticket,
               display: `Ticket #${ticket}`,
               secondary: `Sequence: ${ticket}`,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedTicketItem = computed(() => {
          const selected = this.selectedSingleTicket();
          if (!selected) return null;
          return this.ticketItems().find(i => i.id === selected) || null;
     });

     // Simulate toggle uses service directly
     toggleSimulate(event: boolean) {
          this.txUiService.toggleSimulate(event);
     }

     toggleMultiSign() {
          this.utilsService.toggleMultiSign(this.useMultiSign(), this.txUiService.signers(), this.txUiService.currentWallet()?.classicAddress || '');
          this.multiSignAddress.set(
               this.txUiService
                    .signers()
                    .map((e: any) => e.Account)
                    .join(',\n')
          );
          this.multiSignSeeds.set(
               this.txUiService
                    .signers()
                    .map((e: any) => e.seed)
                    .join(',\n')
          );
          this.signerQuorum.set(this.txUiService.signerQuorum());
     }
}
