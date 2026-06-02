import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { SelectSearchDropdownComponent } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
import { ToggleSliderComponent } from '../toggle-slider/toggle-slider.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-transaction-options',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, MatSlideToggleModule, ToggleSliderComponent, NgIcon],
     templateUrl: './transaction-options.component.html',
     styleUrl: './transaction-options.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionOptionsComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly walletManagerService = inject(WalletManagerService);
     Array = Array;

     // Signals
     readonly activeTab = input<() => string>();
     readonly showWhenTab = input<string | string[]>('*');

     readonly multiSigningEnabled = input.required<boolean>();
     readonly regularKeySigningEnabled = input.required<boolean>();

     readonly showMemo = input<boolean>(true);
     readonly showMultiSign = input<boolean>(true);
     readonly showRegularKey = input<boolean>(true);
     readonly showTicket = input<boolean>(true);
     readonly showSimulate = input<boolean>(true);

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

     // Memo Management Methods
     addMemo() {
          const currentMemos = this.xrplTxOptionsStore.memos();
          this.xrplTxOptionsStore.updateMemos([
               ...currentMemos,
               {
                    Memo: {
                         MemoData: '',
                         MemoType: '',
                         MemoFormat: '',
                    },
               },
          ]);
     }

     removeMemo(index: number) {
          const currentMemos = this.xrplTxOptionsStore.memos();
          const updatedMemos = currentMemos.filter((_: any, i: number) => i !== index);
          this.xrplTxOptionsStore.updateMemos(updatedMemos);
     }

     updateMemoData(index: number, data: string) {
          const currentMemos = this.xrplTxOptionsStore.memos();
          const updatedMemos = [...currentMemos];
          updatedMemos[index] = {
               ...updatedMemos[index],
               Memo: {
                    ...updatedMemos[index].Memo,
                    MemoData: data,
               },
          };
          this.xrplTxOptionsStore.updateMemos(updatedMemos);
     }

     updateMemoType(index: number, type: string) {
          const currentMemos = this.xrplTxOptionsStore.memos();
          const updatedMemos = [...currentMemos];
          updatedMemos[index] = {
               ...updatedMemos[index],
               Memo: {
                    ...updatedMemos[index].Memo,
                    MemoType: type,
               },
          };
          this.xrplTxOptionsStore.updateMemos(updatedMemos);
     }

     updateMemoFormat(index: number, format: string) {
          const currentMemos = this.xrplTxOptionsStore.memos();
          const updatedMemos = [...currentMemos];
          updatedMemos[index] = {
               ...updatedMemos[index],
               Memo: {
                    ...updatedMemos[index].Memo,
                    MemoFormat: format,
               },
          };
          this.xrplTxOptionsStore.updateMemos(updatedMemos);
     }

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
               this.xrplTxOptionsStore.updateMemos([]);
          } else if (this.xrplTxOptionsStore.memos().length === 0) {
               // Add one empty memo by default when toggling on
               this.addMemo();
          }
     }

     onMemoInput(value: string) {
          const cleaned = value
               .split(',')
               .map(v => v.trim())
               .filter(Boolean);
          this.xrplTxOptionsStore.updateMemos(cleaned);
     }

     clearMemoData(index: number, event: MouseEvent) {
          event.stopPropagation();
          this.xrplTxOptionsStore.clearMemoData(index);
     }

     clearMemoType(index: number, event: MouseEvent) {
          event.stopPropagation();
          this.xrplTxOptionsStore.clearMemoType(index);
     }

     clearMemoFormat(index: number, event: MouseEvent) {
          event.stopPropagation();
          this.xrplTxOptionsStore.clearMemoFormat(index);
     }

     clearAllMemoFields(index: number) {
          this.xrplTxOptionsStore.clearAllMemoFields(index);
     }

     onMultiSignToggled(enabled: boolean) {
          this.xrplTxOptionsStore.setField('useMultiSign', enabled);

          if (this.xrplTxOptionsStore.isRegularKeyAddress()) {
               this.xrplTxOptionsStore.setField('isRegularKeyAddress', false);
          }

          if (!enabled) return;

          const store = this.accountConfiguratorStoreService;
          this.utilsService.toggleMultiSign(this.xrplTxOptionsStore.useMultiSign(), this.accountConfiguratorStoreService.signers(), this.walletManagerService.getSelectedWallet()?.classicAddress || '');

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

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket());
}
