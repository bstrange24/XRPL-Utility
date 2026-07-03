import { TestBed } from '@angular/core/testing';

import { LoanBrokerViewModelService } from './loan-broker-view-model.service';

describe('LoanBrokerViewModelService', () => {
  let service: LoanBrokerViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
