import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';
import { SelectSearchDropdownComponent } from '../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';

@Component({
     selector: 'app-transaction-options',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './transaction-options.component.html',
     styleUrl: './transaction-options.component.css',
})
export class TransactionOptionsComponent {
     txUiService = inject(TransactionUiService);
     utilsService = inject(UtilsService);
     xrplTxOptionsStore = inject(XrplTxOptionsStore);
     accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     Array = Array;

     /* -------------------- SIGNAL INPUTS -------------------- */
     activeTab = input<() => string>();
     showWhenTab = input<string | string[]>('*');

     multiSigningEnabled = input.required<boolean>();
     regularKeySigningEnabled = input.required<boolean>();

     showMemo = input(true);
     showMultiSign = input(true);
     showRegularKey = input(true);
     showTicket = input(true);
     showSimulate = input(true);

     showEnableTrustline = input<boolean>(false);

     /* -------------------- SIGNAL STATE -------------------- */
     isMemoEnabled = this.txUiService.isMemoEnabled;
     useMultiSign = this.txUiService.useMultiSign;
     isSimulateEnabled = this.txUiService.isSimulateEnabled;
     isTicket = this.txUiService.isTicket;

     isShowEnableTrustline = this.txUiService.showEnableTrustline;

     memoField = this.xrplTxOptionsStore.memos;

     multiSignAddress = this.accountConfiguratorStoreService.signal('multiSignAddress');
     multiSignSeeds = this.accountConfiguratorStoreService.signal('multiSignSeeds');
     signerQuorum = this.accountConfiguratorStoreService.signal('signerQuorum');

     isRegularKeyAddress = this.accountConfiguratorStoreService.signal('isRegularKeyAddress');
     regularKeyAddress = this.accountConfiguratorStoreService.signal('regularKeyAddress');
     regularKeySeed = this.accountConfiguratorStoreService.signal('regularKeySeed');

     selectedSingleTicket = this.txUiService.selectedSingleTicket;
     selectedTickets = this.txUiService.selectedTickets;
     multiSelectMode = this.txUiService.multiSelectMode;
     ticketArray = this.txUiService.ticketArray;

     /* -------------------- COMPUTED -------------------- */
     showPanel = computed(() => {
          const tab = this.activeTab()?.() ?? '';
          const allowed = this.showWhenTab();

          if (allowed === '*') return true;

          if (Array.isArray(allowed)) {
               return allowed.includes(tab);
          }

          return allowed === tab;
     });

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

     /* -------------------- ACTIONS -------------------- */
     toggleSimulate(value: boolean) {
          this.txUiService.toggleSimulate(value);
     }

     toggleShowEnableTrustline(value: boolean) {
          this.txUiService.toggleShowEnableTrustline(value);
     }

     onMemoToggled(enabled: boolean) {
          this.isMemoEnabled.set(enabled);

          if (!enabled) {
               this.xrplTxOptionsStore.addMemo('');
          }
     }

     onMemoInput(value: string) {
          const cleaned = value
               .split(',')
               .map(v => v.trim())
               .filter(Boolean);

          this.xrplTxOptionsStore.updateMemos(cleaned);
     }

     onMultiSignToggled(enabled: boolean) {
          this.useMultiSign.set(enabled);

          if (!enabled) return;

          this.utilsService.toggleMultiSign(this.useMultiSign(), this.accountConfiguratorStoreService.get('signers'), this.txUiService.currentWallet()?.classicAddress || '');

          this.accountConfiguratorStoreService.set(
               'multiSignAddress',
               this.accountConfiguratorStoreService
                    .get('signers')
                    .map((s: { Account: any }) => s.Account)
                    .join(',\n')
          );

          this.accountConfiguratorStoreService.set(
               'multiSignSeeds',
               this.accountConfiguratorStoreService
                    .get('signers')
                    .map((s: { seed: any }) => s.seed)
                    .join(',\n')
          );

          this.accountConfiguratorStoreService.set('signerQuorum', this.accountConfiguratorStoreService.get('signerQuorum'));
     }

     onRegularKeyToggled(enabled: boolean) {
          this.isRegularKeyAddress.set(enabled);
     }
}
