import { TestBed } from '@angular/core/testing';

import { LoanBrokerTransactionBuilderService } from './loan-broker-transaction-builder.service';

describe('LoanBrokerTransactionBuilderService', () => {
  let service: LoanBrokerTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
