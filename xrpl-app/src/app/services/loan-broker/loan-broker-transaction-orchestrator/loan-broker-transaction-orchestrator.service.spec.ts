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

  it('includes the selected loan ID in loan-management simulation feedback', () => {
    const successSpy = spyOn(service.toastService, 'success');

    service.handleSimulationSuccess('impairLoan', {}, undefined, { selectedLoanId: 'loan-123' });

    expect(successSpy.calls.mostRecent().args[0]).toContain('loan-123');
  });
});
