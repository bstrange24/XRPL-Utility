import { TestBed } from '@angular/core/testing';

import { NftTransactionViewModelService } from './nft-transaction-view-model.service';

describe('NftTransactionViewModelService', () => {
  let service: NftTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
