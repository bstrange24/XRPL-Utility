import { computed, inject, Injectable } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { NftOfferValidatorService } from '../nft-offer-validator/nft-offer-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftBuyService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftOfferValidatorService = inject(NftOfferValidatorService);

     canBuyOffer = computed(() => {
          const nftOfferId = this.nftCreateStoreService.nftOfferId()?.trim() ?? '';
          if (!nftOfferId) return false;

          if (this.nftOfferValidatorService.isNftOfferIndexInvalid()) return false;
          if (this.nftOfferValidatorService.isNftTokenIdInvalid()) return false;
          return true;
     });
}
