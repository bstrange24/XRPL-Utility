import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-nft-cancel-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, MatSlideToggleModule, NgIcon, FocusBorderDirective, FieldHelperComponent, ValidationErrorsComponent],
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

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canCancelNftOfferChange.emit(this.nftCancelService.canCancelOffer());
               this.validationErrorsChange.emit(this.nftOfferValidatorService.getAllValidationErrors());
          });
     }

     // Helper info items
     readonly offerIndexHelperItems = AppConstants.NFT_OFFER_INDEX_HELPER_ITEMS;

     // Inputs
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly destinationSearchQuery = input<string | null>(null);

     // Outputs
     readonly canCancelNftOfferChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();
     readonly nftSelected = output<any>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly destinationChanged = output<SelectItem | null>();
     readonly optionsToggled = output<boolean>();
     readonly expirationToggled = output<boolean>();
     readonly destinationSearchQueryChange = output<string>();
     readonly destinationValueChange = output<SelectItem | null>();
     readonly currencySelected = output<SelectItem | null>();
     readonly issuerSelected = output<SelectItem | null>();

     // UI State
     showOfferIndexHelper = signal(false);
     isOfferIndexFocused = signal(false);

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

     onNftSelected(item: SelectItem | null) {
          const id = item?.id || '';

          this.nftCreateStoreService.setField('nftId', id);
     }

     onOfferSelected(item: SelectItem | null) {
          const id = item?.id || '';
          this.nftCreateStoreService.setField('nftOfferId', id);
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
