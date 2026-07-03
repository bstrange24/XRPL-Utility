import { TestBed } from '@angular/core/testing';

import { LoanBrokerUtilService } from './loan-broker-util.service';

describe('LoanBrokerUtilService', () => {
  let service: LoanBrokerUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
