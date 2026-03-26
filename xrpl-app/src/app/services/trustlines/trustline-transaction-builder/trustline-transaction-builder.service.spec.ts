import { TestBed } from '@angular/core/testing';

import { TrustlineTransactionBuilderService } from './trustline-transaction-builder.service';

describe('TrustlineTransactionBuilderService', () => {
  let service: TrustlineTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
