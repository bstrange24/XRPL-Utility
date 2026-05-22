import { TestBed } from '@angular/core/testing';

import { NftSellService } from './nft-sell.service';

describe('NftSellService', () => {
  let service: NftSellService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftSellService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
