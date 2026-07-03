import { TestBed } from '@angular/core/testing';

import { LoanBrokerStoreService } from './loan-broker-store.service';

describe('LoanBrokerStoreService', () => {
  let service: LoanBrokerStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
