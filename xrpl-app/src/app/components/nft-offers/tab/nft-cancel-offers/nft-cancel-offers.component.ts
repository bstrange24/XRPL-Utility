import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, Input, output, Output, signal } from '@angular/core';
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
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { NftOfferValidatorService } from '../../../../services/shared/validators/nft-offer/nft-offer-validator/nft-offer-validator.service';
import { NftCancelOfferService } from '../../../../services/shared/validators/nft-offer/nft-cancel-offer/nft-cancel-offer.service';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-nft-cancel-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, MatSlideToggleModule, NgIcon, FocusBorderDirective, FieldHelperComponent],
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
     public readonly nftOfferValidatorService = inject(NftOfferValidatorService);
     public readonly nftCancelService = inject(NftCancelOfferService);

     // Helper info items
     readonly offerIndexHelperItems = AppConstants.NFT_OFFER_INDEX_HELPER_ITEMS;

     // Outputs
     canCancelNftOfferChange = output<boolean>();
     validationErrorsChange = output<string[]>();

     // UI State
     showOfferIndexHelper = signal(false);
     isOfferIndexFocused = signal(false);

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

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canCancelNftOfferChange.emit(this.nftCancelService.canCancelOffer());
               this.validationErrorsChange.emit(this.nftOfferValidatorService.getAllValidationErrors());
          });
     }

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

     // Clear methods
     clearOfferIndex() {
          this.nftCreateStoreService.setField('nftOfferId', '');
     }

     // Helper toggles
     toggleOfferIndexHelper() {
          this.showOfferIndexHelper.set(!this.showOfferIndexHelper());
     }

     // Focus handlers
     onOfferIndexFocus() {
          this.isOfferIndexFocused.set(true);
     }

     onOfferIndexBlur() {
          this.isOfferIndexFocused.set(false);
     }
}
