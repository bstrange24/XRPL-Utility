import { TestBed } from '@angular/core/testing';

import { EscrowTransactionBuilderService } from './escrow-transaction-builder.service';

describe('EscrowTransactionBuilderService', () => {
  let service: EscrowTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscrowTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
