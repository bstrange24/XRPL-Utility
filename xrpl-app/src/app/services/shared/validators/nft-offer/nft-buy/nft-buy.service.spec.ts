import { TestBed } from '@angular/core/testing';

import { NftBuyService } from './nft-buy.service';

describe('NftBuyService', () => {
  let service: NftBuyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftBuyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
