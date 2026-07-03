import { TestBed } from '@angular/core/testing';

import { LoanBrokerTransactionOrchestratorService } from './loan-broker-transaction-orchestrator.service';

describe('LoanBrokerTransactionOrchestratorService', () => {
  let service: LoanBrokerTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
