import { Component, inject, Input } from '@angular/core';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgIcon } from '@ng-icons/core';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

@Component({
     selector: 'app-escrows-finish',
     standalone: true,
     imports: [CommonModule, FormsModule, MatSlideToggleModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './escrows-finish.component.html',
     styleUrl: './escrows-finish.component.css',
})
export class EscrowsFinishComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     private readonly walletManager = inject(WalletManagerService);

     @Input() isConditional = false;

     public get activeTab() {
          return this.viewModel.activeTab();
     }

     // Uses allEscrowsRaw filtered to Destination === currentWallet (finish = receiver)
     public escrowItems() {
          const address = this.walletManager.getSelectedWallet()?.address || '';
          return this.escrowUtilService.escrowItems(
               this.escrowStoreService.allEscrowsRaw(),
               address,
               false // false = finishEscrow (filter by Destination)
          );
     }

     public selectedEscrowItem() {
          return this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.escrowStoreService.escrowSequenceNumber());
     }

     public selectedEscrowIsExpired(): boolean {
          return this.viewModel.selectedEscrowIsExpired();
     }

     public onEscrowSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.escrowStoreService.setField('escrowSequenceNumber', '');
               this.escrowStoreService.setField('escrowOwner', '');
               return;
          }
          // For finish: find the escrow in allEscrowsRaw, set sequence + owner (Sender)
          const escrow = this.escrowStoreService.allEscrowsRaw().find((e: any) => e.EscrowSequence?.toString() === item.id);
          if (escrow) {
               this.escrowStoreService.setField('escrowSequenceNumber', escrow.EscrowSequence);
               this.escrowStoreService.setField('escrowOwner', escrow.Sender);
          }
     }
}
