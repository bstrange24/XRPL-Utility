import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SelectItem, SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';

@Component({
     selector: 'app-create-offer',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent],
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

     readonly offerFlagsConfig = [
          { key: 'isPassive' as const, title: 'Passive', desc: 'The offer does not consume offers that exactly match it, and instead becomes an Offer object in the ledger.' },
          { key: 'isFillOrKill' as const, title: 'Fill Or Kill', desc: 'Only try to match existing offers in the ledger, and only do so if the entire TakerPays quantity can be obtained.' },
          { key: 'isMarketOrder' as const, title: 'Immediate Or Cancel', desc: 'The offer never becomes a ledger object: it only tries to match existing offers in the ledger.' },
     ] as const;

     toggleFlag(key: 'isPassive' | 'isFillOrKill' | 'isMarketOrder'): void {
          this.offerStoreService.setField(key, !this.offerStoreService[key]());
     }
}
