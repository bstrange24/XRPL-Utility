import { TestBed } from '@angular/core/testing';

import { NftOfferValidatorService } from './nft-offer-validator/nft-offer-validator.service';

describe('NftOfferValidatorService', () => {
     let service: NftOfferValidatorService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(NftOfferValidatorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
