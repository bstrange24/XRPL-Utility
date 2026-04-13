import { TestBed } from '@angular/core/testing';

import { DelegateTransactionViewModelService } from './delegate-transaction-view-model.service';

describe('DelegateTransactionViewModelService', () => {
  let service: DelegateTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DelegateTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
