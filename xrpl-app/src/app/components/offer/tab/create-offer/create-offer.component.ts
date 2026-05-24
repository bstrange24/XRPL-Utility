import { Component, inject, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-create-offer',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './create-offer.component.html',
     styleUrl: './create-offer.component.css',
})
export class CreateOfferTabComponent {
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);

     readonly weWantCurrencySelected = output<SelectItem | null>();
     readonly weWantIssuerSelected = output<SelectItem | null>();
     readonly weSpendCurrencySelected = output<SelectItem | null>();
     readonly weSpendIssuerSelected = output<SelectItem | null>();
     readonly weWantAmountChange = output<void>();
     readonly weSpendAmountChange = output<void>();
     readonly invertOrder = output<void>();

     // Helper Items
     readonly takerGetsCurrencyHelperItems = AppConstants.TAKER_GETS_CURRENCY_HELPER_ITEMS;
     readonly takerGetsIssuerHelperItems = AppConstants.TAKER_GETS_ISSUER_HELPER_ITEMS;
     readonly takerGetsAmountHelperItems = AppConstants.TAKER_GETS_AMOUNT_HELPER_ITEMS;
     readonly takerPaysCurrencyHelperItems = AppConstants.TAKER_PAYS_CURRENCY_HELPER_ITEMS;
     readonly takerPaysIssuerHelperItems = AppConstants.TAKER_PAYS_ISSUER_HELPER_ITEMS;
     readonly takerPaysAmountHelperItems = AppConstants.TAKER_PAYS_AMOUNT_HELPER_ITEMS;
     readonly balance1HelperItems = AppConstants.BALANCE1_HELPER_ITEMS;
     readonly balance2HelperItems = AppConstants.BALANCE2_HELPER_ITEMS;

     // UI Signals
     showTakerGetsCurrencyHelper = signal(false);
     showTakerGetsIssuerHelper = signal(false);
     showTakerGetsAmountHelper = signal(false);
     showTakerPaysCurrencyHelper = signal(false);
     showTakerPaysIssuerHelper = signal(false);
     showTakerPaysAmountHelper = signal(false);
     showBalance1Helper = signal(false);
     showBalance2Helper = signal(false);

     readonly offerFlagsConfig = [
          { key: 'isPassive' as const, title: 'Passive', desc: 'The offer does not consume offers that exactly match it, and instead becomes an Offer object in the ledger.' },
          { key: 'isFillOrKill' as const, title: 'Fill Or Kill', desc: 'Only try to match existing offers in the ledger, and only do so if the entire TakerPays quantity can be obtained.' },
          { key: 'isMarketOrder' as const, title: 'Immediate Or Cancel', desc: 'The offer never becomes a ledger object: it only tries to match existing offers in the ledger.' },
     ] as const;

     selectFlag(key: 'isPassive' | 'isFillOrKill' | 'isMarketOrder'): void {
          // Reset all flags
          this.offerStoreService.setField('isPassive', false);
          this.offerStoreService.setField('isFillOrKill', false);
          this.offerStoreService.setField('isMarketOrder', false);

          // Set the selected flag
          this.offerStoreService.setField(key, true);
     }

     // Toggle Methods
     toggleTakerGetsCurrencyHelper() {
          this.showTakerGetsCurrencyHelper.set(!this.showTakerGetsCurrencyHelper());
     }

     toggleTakerGetsIssuerHelper() {
          this.showTakerGetsIssuerHelper.set(!this.showTakerGetsIssuerHelper());
     }

     toggleTakerGetsAmountHelper() {
          this.showTakerGetsAmountHelper.set(!this.showTakerGetsAmountHelper());
     }

     toggleTakerPaysCurrencyHelper() {
          this.showTakerPaysCurrencyHelper.set(!this.showTakerPaysCurrencyHelper());
     }

     toggleTakerPaysIssuerHelper() {
          this.showTakerPaysIssuerHelper.set(!this.showTakerPaysIssuerHelper());
     }

     toggleTakerPaysAmountHelper() {
          this.showTakerPaysAmountHelper.set(!this.showTakerPaysAmountHelper());
     }

     toggleBalance1Helper() {
          this.showBalance1Helper.set(!this.showBalance1Helper());
     }

     toggleBalance2Helper() {
          this.showBalance2Helper.set(!this.showBalance2Helper());
     }
}
