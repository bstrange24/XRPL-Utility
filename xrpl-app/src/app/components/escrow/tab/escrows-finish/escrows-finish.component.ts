import { ChangeDetectionStrategy, Component, computed, effect, inject, Input, output, signal } from '@angular/core';
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
import { EscrowValidatorService } from '../../../../services/shared/validators/escrow-validator/escrow-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-escrows-finish',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, MatSlideToggleModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './escrows-finish.component.html',
     styleUrl: './escrows-finish.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowsFinishComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);

     // Helper Items
     readonly escrowFinishSelectorHelperItems = AppConstants.ESCROW_FINISH_SELECTOR_HELPER_ITEMS;
     readonly escrowSequenceHelperItems = AppConstants.ESCROW_SEQUENCE_HELPER_ITEMS;
     readonly escrowOwnerHelperItems = AppConstants.ESCROW_OWNER_HELPER_ITEMS;
     readonly escrowAmountHelperItems = AppConstants.ESCROW_AMOUNT_FINISH_HELPER_ITEMS;
     readonly escrowConditionHelperItems = AppConstants.ESCROW_CONDITION_HELPER_ITEMS;
     readonly escrowFulfillmentHelperItems = AppConstants.ESCROW_FULFILLMENT_HELPER_ITEMS;

     // UI Signals
     showEscrowFinishSelectorHelper = signal(false);
     showEscrowSequenceHelper = signal(false);
     showEscrowOwnerHelper = signal(false);
     showEscrowAmountHelper = signal(false);
     showEscrowConditionHelper = signal(false);
     showEscrowFulfillmentHelper = signal(false);
     canFinishEscrowChange = output<boolean>();

     @Input() isConditional = false;

     constructor() {
  effect(() => {
    this.canFinishEscrowChange.emit(this.canFinishEscrow());   // if you have this output
  });
}

     public get activeTab() {
          return this.viewModel.activeTab();
     }

     canFinishEscrow = computed(() => {
  const hasSelection = !!this.escrowStoreService.escrowSequenceNumber();
  const notExpired = !this.viewModel.selectedEscrowIsExpired();

  return hasSelection && notExpired;
});

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

     showClearFulfillmentButton(): boolean {
          return this.escrowValidatorService.hasInvalidFulfillment() || (this.escrowValidatorService.hasInvalidConditionFulfillmentPair() && !this.escrowValidatorService.hasInvalidCondition());
     }

     // Toggle Methods
     toggleEscrowSelectorHelper() {
          this.showEscrowFinishSelectorHelper.set(!this.showEscrowFinishSelectorHelper());
     }

     toggleEscrowSequenceHelper() {
          this.showEscrowSequenceHelper.set(!this.showEscrowSequenceHelper());
     }

     toggleEscrowOwnerHelper() {
          this.showEscrowOwnerHelper.set(!this.showEscrowOwnerHelper());
     }

     toggleEscrowAmountHelper() {
          this.showEscrowAmountHelper.set(!this.showEscrowAmountHelper());
     }

     toggleConditionHelper() {
          this.showEscrowConditionHelper.set(!this.showEscrowConditionHelper());
     }

     toggleFulfillmentHelper() {
          this.showEscrowFulfillmentHelper.set(!this.showEscrowFulfillmentHelper());
     }
}
