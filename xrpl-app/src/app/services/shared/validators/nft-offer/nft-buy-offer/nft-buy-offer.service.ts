import { computed, inject, Injectable } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { NftOfferValidatorService } from '../nft-offer-validator/nft-offer-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftBuyOfferService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftOfferValidatorService = inject(NftOfferValidatorService);

     canBuyNftOffer = computed(() => {
  const nftId = this.nftCreateStoreService.nftId()?.trim() ?? '';
  const amount = this.nftCreateStoreService.amount()?.trim() ?? '';
  if (!nftId || !amount) return false;

  if (this.nftOfferValidatorService.isNftTokenIdInvalid()) return false;
  if (this.nftOfferValidatorService.isAmountInvalid()) return false;
  if (!this.nftOfferValidatorService.isCurrencyValid()) return false;
  return true;
});
     // Overall Form Validation
     // canBuyNftOffer = computed(() => {
     //      if (this.nftOfferValidatorService.isNftTokenIdInvalid()) return false;
     //      if (this.nftOfferValidatorService.isAmountInvalid()) return false;
     //      if (!this.nftOfferValidatorService.isCurrencyValid()) return false;
     //      if (!this.nftOfferValidatorService.isNftSellExpirationValid()) return false;
     //      return true;
     // });
}
