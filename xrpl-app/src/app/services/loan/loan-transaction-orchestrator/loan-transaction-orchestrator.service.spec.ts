import { TestBed } from '@angular/core/testing';

import { LoanTransactionOrchestratorService } from './loan-transaction-orchestrator.service';

describe('LoanTransactionOrchestratorService', () => {
     let service: LoanTransactionOrchestratorService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(LoanTransactionOrchestratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
