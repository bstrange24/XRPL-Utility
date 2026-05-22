import { computed, inject, Injectable } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { UriValidatorService } from '../../uri-validator/uri-validator.service';
import { NftValidatorService } from '../nft-validator/nft-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftBurnValidatorService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftValidatorService = inject(NftValidatorService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly nftUtilService = inject(NftUtilService);

     // Overall Form Validation
     canBurnNft = computed(() => {
          if (this.nftValidatorService.isNftTokenIdInvalid()) return false;
          return true;
     });
}
