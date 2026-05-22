import { TestBed } from '@angular/core/testing';

import { NftBuyOfferService } from './nft-buy-offer.service';

describe('NftBuyOfferService', () => {
  let service: NftBuyOfferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftBuyOfferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
