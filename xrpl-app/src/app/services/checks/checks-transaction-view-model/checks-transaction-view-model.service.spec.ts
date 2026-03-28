import { TestBed } from '@angular/core/testing';

import { ChecksTransactionViewModelService } from './checks-transaction-view-model.service';

describe('ChecksTransactionViewModelService', () => {
  let service: ChecksTransactionViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecksTransactionViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
