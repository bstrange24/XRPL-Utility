import { ChangeDetectionStrategy, Component, inject, Input, signal } from '@angular/core';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgIcon } from '@ng-icons/core';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-escrows-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, MatSlideToggleModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './escrows-cancel.component.html',
     styleUrl: './escrows-cancel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowsCancelComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     private readonly walletManager = inject(WalletManagerService);

     readonly escrowSelectorHelperItems = AppConstants.ESCROW_SELECTOR_HELPER_ITEMS;
     readonly escrowSequenceHelperItems = AppConstants.ESCROW_SEQUENCE_HELPER_ITEMS;
     readonly escrowAmountHelperItems = AppConstants.ESCROW_AMOUNT_FINISH_HELPER_ITEMS;
     readonly escrowCreatorHelperItems = AppConstants.ESCROW_CREATOR_HELPER_ITEMS;
     readonly escrowDestinationHelperItems = AppConstants.ESCROW_DESTINATION_FINISH_HELPER_ITEMS;

     // UI Signals
     showEscrowSelectorHelper = signal(false);
     showEscrowSequenceHelper = signal(false);
     showEscrowAmountHelper = signal(false);
     showEscrowCreatorHelper = signal(false);
     showEscrowDestinationHelper = signal(false);

     @Input() isConditional = false;

     public get activeTab() {
          return this.viewModel.activeTab();
     }

     // Uses allEscrowsRaw filtered to Sender === currentWallet (cancel = creator)
     public escrowItems() {
          const address = this.walletManager.getSelectedWallet()?.address || '';
          return this.escrowUtilService.escrowItems(
               this.escrowStoreService.allEscrowsRaw(),
               address,
               true // true = cancelEscrow (filter by Sender)
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
          this.escrowStoreService.setField('escrowSequenceNumber', item.id);
          // Look up the Sender from allEscrowsRaw so escrowOwner is always correct
          const escrow = this.escrowStoreService.allEscrowsRaw().find((e: any) => e.EscrowSequence?.toString() === item.id);
          if (escrow) {
               this.escrowStoreService.setField('escrowOwner', escrow.Sender);
          }
     }

     // Toggle Methods
     toggleEscrowSelectorHelper() {
          this.showEscrowSelectorHelper.set(!this.showEscrowSelectorHelper());
     }

     toggleEscrowSequenceHelper() {
          this.showEscrowSequenceHelper.set(!this.showEscrowSequenceHelper());
     }

     toggleEscrowAmountHelper() {
          this.showEscrowAmountHelper.set(!this.showEscrowAmountHelper());
     }

     toggleEscrowCreatorHelper() {
          this.showEscrowCreatorHelper.set(!this.showEscrowCreatorHelper());
     }

     toggleEscrowDestinationHelper() {
          this.showEscrowDestinationHelper.set(!this.showEscrowDestinationHelper());
     }
}
