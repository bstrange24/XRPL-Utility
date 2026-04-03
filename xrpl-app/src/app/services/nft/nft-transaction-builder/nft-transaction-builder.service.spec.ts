import { TestBed } from '@angular/core/testing';

import { NftTransactionBuilderService } from './nft-transaction-builder.service';

describe('NftTransactionBuilderService', () => {
  let service: NftTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
