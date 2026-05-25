import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';

@Component({
     selector: 'app-checks-cash',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, FocusBorderDirective, NgIcon, LucideAngularModule, ToggleSliderComponent, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './checks-cash.component.html',
     styleUrl: './checks-cash.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCashComponent {
     readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     readonly txUiService = inject(TransactionUiService);
     readonly utilsService = inject(UtilsService);
     readonly trustlineStoreService = inject(TrustlineStoreService);
     readonly checkStoreService = inject(ChecksStoreService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly checksStoreService = inject(ChecksStoreService);
     private readonly currencyStoreService = inject(CurrencyStoreService);
     private readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // Input
     showEnableTrustline = input<boolean>(false);

     // Outputs
     checkItems = output<SelectItem | null>();
     checkSelected = output<SelectItem | null>();
     selectedCheckItem = output<SelectItem | null>();

     // Helper Items
     readonly checkCashSelectorHelperItems = AppConstants.CHECK_CASH_SELECTOR_HELPER_ITEMS;
     readonly checkCreatorHelperItems = AppConstants.CHECK_CREATOR_HELPER_ITEMS;
     readonly checkIssuerHelperItems = AppConstants.CHECK_ISSUER_CASH_HELPER_ITEMS;
     readonly checkOriginalAmountHelperItems = AppConstants.CHECK_ORIGINAL_AMOUNT_HELPER_ITEMS;
     readonly checkIndexHelperItems = AppConstants.CHECK_INDEX_HELPER_ITEMS;
     readonly cashAmountHelperItems = AppConstants.CASH_AMOUNT_HELPER_ITEMS;
     readonly deliverMinHelperItems = AppConstants.DELIVER_MIN_HELPER_ITEMS;

     // UI Signals
     showCheckCashSelectorHelper = signal(false);
     showCheckCreatorHelper = signal(false);
     showCheckIssuerHelper = signal(false);
     showCheckOriginalAmountHelper = signal(false);
     showCheckIndexHelper = signal(false);
     showCashAmountHelper = signal(false);
     showDeliverMinHelper = signal(false);

     // Add this method to the ChecksCashComponent class
     onCheckSelected(item: SelectItem | null) {
          if (!item?.id) {
               // Clear the check details
               this.checksStoreService.setField('checkIdField', '');
               this.checksStoreService.setField('checkCreator', '');
               this.checksStoreService.setField('amount', '');
               this.currencyStoreService?.setField('currencyCode', '');
               this.currencyStoreService?.setField('currencyIssuer', '');
               return;
          }

          const id = item?.id || '';
          this.checksStoreService.setField('checkIdField', id);

          // Parse the display string to get amount and currency
          const parts = item.display?.split(' ') || [];
          this.checksStoreService.setField('checkCreator', parts[3] || '');

          if (this.currencyStoreService) {
               this.currencyStoreService.setField('currencyCode', this.utilsService.encodeIfNeeded(parts[1]) || '');
               this.currencyStoreService.setField('currencyIssuer', item.issuer || '');
          }

          if (parts[1] === AppConstants.XRP_CURRENCY) {
               this.xrplTxOptionsStore?.setField('showEnableTrustline', false);
          } else {
               this.xrplTxOptionsStore?.setField('showEnableTrustline', true);
          }
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     // Toggle Methods
     toggleCheckSelectorHelper() {
          this.showCheckCashSelectorHelper.set(!this.showCheckCashSelectorHelper());
     }

     toggleCheckCreatorHelper() {
          this.showCheckCreatorHelper.set(!this.showCheckCreatorHelper());
     }

     toggleCheckIssuerHelper() {
          this.showCheckIssuerHelper.set(!this.showCheckIssuerHelper());
     }

     toggleCheckAmountHelper() {
          this.showCheckOriginalAmountHelper.set(!this.showCheckOriginalAmountHelper());
     }

     toggleCheckIdHelper() {
          this.showCheckIndexHelper.set(!this.showCheckIndexHelper());
     }

     toggleCashAmountHelper() {
          this.showCashAmountHelper.set(!this.showCashAmountHelper());
     }

     toggleDeliverMinHelper() {
          this.showDeliverMinHelper.set(!this.showDeliverMinHelper());
     }
}
