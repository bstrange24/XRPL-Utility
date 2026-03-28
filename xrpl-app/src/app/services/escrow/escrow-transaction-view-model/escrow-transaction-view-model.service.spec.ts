import { TestBed } from '@angular/core/testing';

import { EscrowTransactionViewModelService } from './escrow-transaction-view-model.service';

describe('EscrowTransactionViewModelService', () => {
  let service: EscrowTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscrowTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
