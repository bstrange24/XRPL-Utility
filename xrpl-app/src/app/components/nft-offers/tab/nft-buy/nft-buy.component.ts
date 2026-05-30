import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { NftOfferValidatorService } from '../../../../services/shared/validators/nft-offer/nft-offer-validator/nft-offer-validator.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { NgIcon } from '@ng-icons/core';
import { NftBuyService } from '../../../../services/shared/validators/nft-offer/nft-buy/nft-buy.service';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-nft-buy',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './nft-buy.component.html',
     styleUrl: './nft-buy.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftBuyComponent {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftOfferValidatorService = inject(NftOfferValidatorService);
     public readonly nftBuyService = inject(NftBuyService);

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canBuyNftChange.emit(this.nftBuyService.canBuyOffer());
               this.validationErrorsChange.emit(this.nftOfferValidatorService.getAllValidationErrors());
          });
     }

     // Helper info items
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;
     readonly offerIndexHelperItems = AppConstants.NFT_OFFER_INDEX_HELPER_ITEMS;

     // Outputs
     readonly canBuyNftChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     // UI State
     showOfferIndexHelper = signal(false);
     showNftIdHelper = signal(false);
     isOfferIndexFocused = signal(false);
     isNftIdFocused = signal(false);

     get nftId() {
          return this.nftCreateStoreService.nftId();
     }

     set nftId(value: string) {
          this.nftCreateStoreService.setField('nftId', value);
     }

     get nftOfferId() {
          return this.nftCreateStoreService.nftOfferId();
     }

     set nftOfferId(value: string) {
          this.nftCreateStoreService.setField('nftOfferId', value);
     }

     // Clear methods
     clearOfferIndex() {
          this.nftCreateStoreService.setField('nftOfferId', '');
     }

     // Clear methods
     clearNftId() {
          this.nftCreateStoreService.setField('nftId', '');
     }

     // Helper toggles
     toggleOfferIndexHelper() {
          this.showOfferIndexHelper.set(!this.showOfferIndexHelper());
     }

     toggleNftIdHelper() {
          this.showNftIdHelper.set(!this.showNftIdHelper());
     }

     // Focus handlers
     onOfferIndexFocus() {
          this.isOfferIndexFocused.set(true);
     }

     onOfferIndexBlur() {
          this.isOfferIndexFocused.set(false);
     }

     onNftIdFocus() {
          this.isNftIdFocused.set(true);
     }

     onNftIdBlur() {
          this.isNftIdFocused.set(false);
     }
}
