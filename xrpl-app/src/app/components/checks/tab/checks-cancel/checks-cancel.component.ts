import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, output, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-checks-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './checks-cancel.component.html',
     styleUrl: './checks-cancel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCancelComponent {
     readonly viewModel = inject(ChecksTransactionViewModelService);
     private readonly checksStoreService = inject(ChecksStoreService);
     private readonly currencyStoreService = inject(CurrencyStoreService);
     private readonly utilsService = inject(UtilsService);
     private readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // Outputs
     checkItems = output<SelectItem | null>();
     checkSelected = output<SelectItem | null>();
     selectedCheckItem = output<SelectItem | null>();

     // Helper Items
     readonly checkCancelSelectorHelperItems = AppConstants.CHECK_CANCEL_SELECTOR_HELPER_ITEMS;
     readonly checkDestinationHelperItems = AppConstants.CHECK_DESTINATION_CANCEL_HELPER_ITEMS;
     readonly checkIssuerHelperItems = AppConstants.CHECK_ISSUER_CANCEL_HELPER_ITEMS;
     readonly checkIdHelperItems = AppConstants.CHECK_ID_HELPER_ITEMS;
     readonly checkAmountHelperItems = AppConstants.CHECK_AMOUNT_CANCEL_HELPER_ITEMS;

     // UI Signals
     showCheckCancelSelectorHelper = signal(false);
     showCheckDestinationHelper = signal(false);
     showCheckIssuerHelper = signal(false);
     showCheckIdHelper = signal(false);
     showCheckAmountHelper = signal(false);

     // Add this method to the ChecksCancelComponent class
     onCheckSelected(item: SelectItem | null) {
          if (!item?.id) {
               // Clear the check details
               this.checksStoreService.setField('checkIdField', '');
               this.checksStoreService.setField('checkCreator', '');
               this.currencyStoreService.setField('currencyCode', '');
               this.currencyStoreService.setField('currencyIssuer', '');
               return;
          }

          const id = item?.id || '';
          this.checksStoreService.setField('checkIdField', id);

          const parts = item.display?.split(' ') || [];
          this.checksStoreService.setField('checkCreator', parts[3] || '');
          this.currencyStoreService.setField('currencyCode', this.utilsService.encodeIfNeeded(parts[1]) || '');
          this.currencyStoreService.setField('currencyIssuer', item.issuer || '');

          if (parts[1] === AppConstants.XRP_CURRENCY) {
               this.xrplTxOptionsStore.setField('showEnableTrustline', false);
          } else {
               this.xrplTxOptionsStore.setField('showEnableTrustline', true);
          }
     }

     // // Uses allEscrowsRaw filtered to Sender === currentWallet (cancel = creator)
     // public escrowItems() {
     //      const address = this.walletManager.getSelectedWallet()?.address || '';
     //      return this.escrowUtilService.escrowItems(
     //           this.escrowStoreService.allEscrowsRaw(),
     //           address,
     //           true // true = cancelEscrow (filter by Sender)
     //      );
     // }

     // public selectedEscrowItem() {
     //      return this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.escrowStoreService.escrowSequenceNumber());
     // }

     // public selectedEscrowIsExpired(): boolean {
     //      return this.viewModel.selectedEscrowIsExpired();
     // }

     // public onEscrowSelected(item: SelectItem | null) {
     //      if (!item?.id) {
     //           this.escrowStoreService.setField('escrowSequenceNumber', '');
     //           this.escrowStoreService.setField('escrowOwner', '');
     //           return;
     //      }
     //      this.escrowStoreService.setField('escrowSequenceNumber', item.id);
     //      // Look up the Sender from allEscrowsRaw so escrowOwner is always correct
     //      const escrow = this.escrowStoreService.allEscrowsRaw().find((e: any) => e.EscrowSequence?.toString() === item.id);
     //      if (escrow) {
     //           this.escrowStoreService.setField('escrowOwner', escrow.Sender);
     //      }
     // }

     // Toggle Methods
     toggleCheckSelectorHelper() {
          this.showCheckCancelSelectorHelper.set(!this.showCheckCancelSelectorHelper());
     }

     toggleCheckDestinationHelper() {
          this.showCheckDestinationHelper.set(!this.showCheckDestinationHelper());
     }

     toggleCheckIssuerHelper() {
          this.showCheckIssuerHelper.set(!this.showCheckIssuerHelper());
     }

     toggleCheckIdHelper() {
          this.showCheckIdHelper.set(!this.showCheckIdHelper());
     }

     toggleCheckAmountHelper() {
          this.showCheckAmountHelper.set(!this.showCheckAmountHelper());
     }
}
