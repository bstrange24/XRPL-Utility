import { TestBed } from '@angular/core/testing';

import { NftCancelOfferService } from './nft-cancel-offer.service';

describe('NftCancelOfferService', () => {
  let service: NftCancelOfferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftCancelOfferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
