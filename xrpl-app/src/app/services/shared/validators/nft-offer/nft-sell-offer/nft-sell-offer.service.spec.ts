import { TestBed } from '@angular/core/testing';

import { NftSellOfferService } from './nft-sell-offer.service';

describe('NftSellOfferService', () => {
  let service: NftSellOfferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftSellOfferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
