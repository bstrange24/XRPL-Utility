import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { CurrencyAmountFormComponent } from '../../../shared/currency-amount-form/currency-amount-form.component';

@Component({
     selector: 'app-nft-sell-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, XrplExpirationInputComponent, MatSlideToggleModule, CurrencyAmountFormComponent],
     templateUrl: './nft-sell-offers.component.html',
     styleUrl: './nft-sell-offers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftSellOffersComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);

     // Destination dropdown – passed from parent (keeps logic in the main page)
     @Input() destinationItems: SelectItem[] = [];
     @Input() selectedDestinationItem: SelectItem | null = null;
     @Input() destinationSearchQuery: string | null = null;
     @Output() destinationChanged = new EventEmitter<SelectItem | null>();
     @Output() currencySelected = new EventEmitter<SelectItem | null>();
     @Output() issuerSelected = new EventEmitter<SelectItem | null>();
     @Output() optionsToggled = new EventEmitter<boolean>();
     @Output() expirationToggled = new EventEmitter<boolean>();
     @Output() destinationSearchQueryChange = new EventEmitter<string>();
     @Output() destinationValueChange = new EventEmitter<SelectItem | null>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     setNftExpirationDate = (value: string): void => {
          this.nftCreateStoreService.setField('expiration', value);
     };

     onNftSelected(item: SelectItem | null) {
          if (item) {
               this.nftCreateStoreService.setField('nftId', item?.id || '');
          }
     }
}
