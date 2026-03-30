import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';
import { SelectSearchDropdownComponent } from '../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';

@Component({
     selector: 'app-transaction-options',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './transaction-options.component.html',
     styleUrl: './transaction-options.component.css',
})
export class TransactionOptionsComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     Array = Array;

     // Signals
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

     // Computed
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
          return this.xrplTxOptionsStore.ticketArray().map((ticket: any) => ({
               id: ticket,
               display: `Ticket #${ticket}`,
               secondary: `Sequence: ${ticket}`,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedTicketItem = computed(() => {
          const selected = this.xrplTxOptionsStore.selectedSingleTicket();
          if (!selected) return null;
          return this.ticketItems().find((i: { id: string }) => i.id === selected) || null;
     });

     // Actions
     toggleSimulate(value: boolean) {
          this.xrplTxOptionsStore.setField('isSimulateEnabled', value);
          this.txUiService.toggleSimulate();
     }

     toggleShowEnableTrustline(value: boolean) {
          this.xrplTxOptionsStore.setField('showEnableTrustline', value);
     }

     onMemoToggled(enabled: boolean) {
          this.xrplTxOptionsStore.setField('isMemoEnabled', enabled);

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
          this.xrplTxOptionsStore.setField('useMultiSign', enabled);

          if (this.xrplTxOptionsStore.isRegularKeyAddress()) {
               this.xrplTxOptionsStore.setField('isRegularKeyAddress', false);
          }

          if (!enabled) return;

          const store = this.accountConfiguratorStoreService;
          this.utilsService.toggleMultiSign(this.xrplTxOptionsStore.useMultiSign(), this.accountConfiguratorStoreService.signers(), this.txUiService.currentWallet()?.classicAddress || '');

          store.setField(
               'multiSignAddress',
               this.accountConfiguratorStoreService
                    .signers()
                    .map((s: { Account: any }) => s.Account)
                    .join(',\n')
          );

          store.setField(
               'multiSignSeeds',
               this.accountConfiguratorStoreService
                    .signers()
                    .map((s: { seed: any }) => s.seed)
                    .join(',\n')
          );

          store.setField('signerQuorum', this.accountConfiguratorStoreService.signerQuorum());
     }

     onRegularKeyToggled(enabled: boolean) {
          if (this.xrplTxOptionsStore.useMultiSign()) {
               this.xrplTxOptionsStore.setField('useMultiSign', false);
          }

          this.xrplTxOptionsStore.setField('isRegularKeyAddress', enabled);
     }
}
