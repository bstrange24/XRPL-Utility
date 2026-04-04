import { TestBed } from '@angular/core/testing';

import { NftOffersTransactionViewModelService } from './nft-offers-transaction-view-model.service';

describe('NftOffersTransactionViewModelService', () => {
  let service: NftOffersTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftOffersTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
