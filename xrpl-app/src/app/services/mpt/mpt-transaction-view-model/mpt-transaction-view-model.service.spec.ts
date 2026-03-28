import { TestBed } from '@angular/core/testing';

import { MptTransactionViewModelService } from './mpt-transaction-view-model.service';

describe('MptTransactionViewModelService', () => {
  let service: MptTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
