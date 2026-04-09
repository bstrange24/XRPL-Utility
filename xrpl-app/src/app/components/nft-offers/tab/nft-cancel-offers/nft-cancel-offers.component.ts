import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
     selector: 'app-nft-cancel-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './nft-cancel-offers.component.html',
     styleUrl: './nft-cancel-offers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftCancelOffersComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftOffersTransactionViewModelService = inject(NftOffersTransactionViewModelService);

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

     selectedOfferItem = computed(() => {
          const id = this.nftCreateStoreService.nftOfferId();
          if (!id) return null;
          return this.nftOffersTransactionViewModelService.offerItems().find(i => i.id === id) || null;
     });

     onOfferSelected(item: SelectItem | null) {
          if (item) {
               this.nftCreateStoreService.setField('nftOfferId', item?.id || '');
          }
     }
}
