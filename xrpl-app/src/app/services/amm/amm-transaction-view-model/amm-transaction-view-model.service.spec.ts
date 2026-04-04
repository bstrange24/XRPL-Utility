import { TestBed } from '@angular/core/testing';

import { AmmTransactionViewModelService } from './amm-transaction-view-model.service';

describe('AmmTransactionViewModelService', () => {
  let service: AmmTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmmTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
