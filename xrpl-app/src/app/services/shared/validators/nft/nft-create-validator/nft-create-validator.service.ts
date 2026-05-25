import { computed, inject, Injectable } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { UriValidatorService } from '../../uri-validator/uri-validator.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { NftValidatorService } from '../nft-validator/nft-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftCreateValidatorService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftValidatorService = inject(NftValidatorService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly nftUtilService = inject(NftUtilService);

     canCreateNft = computed(() => {
  if (!this.nftValidatorService.isTaxonValid()) return false;
  if (this.uriValidatorService.hasNftCreateInvalidUri()) return false;
  if (this.nftValidatorService.isTransferFeeInvalid()) return false;
  if (this.nftValidatorService.isNftMinterInvalid()) return false;
  if (this.nftValidatorService.isNftOwnerInvalid()) return false;
  if (this.nftValidatorService.checkForTransferFeeAndTransferFlag()) return false;

  return true;
});
     // Overall Form Validation
     // canCreateNft = computed(() => {
     //      if (this.nftValidatorService.isTaxonInvalid()) return false;
     //      if (this.uriValidatorService.hasNftCreateInvalidUri()) return false;
     //      if (this.nftValidatorService.isTransferFeeInvalid()) return false;
     //      if (this.nftValidatorService.isNftMinterInvalid()) return false;
     //      if (this.nftValidatorService.isNftOwnerInvalid()) return false;
     //      if (this.nftValidatorService.isNftTokenIdInvalid()) return false;
     //      if (this.nftValidatorService.hasInvalidNftSellExpiration()) return false;
     //      if (this.nftValidatorService.checkForTransferFeeAndTransferFlag()) return false;
     //      return true;
     // });
}
