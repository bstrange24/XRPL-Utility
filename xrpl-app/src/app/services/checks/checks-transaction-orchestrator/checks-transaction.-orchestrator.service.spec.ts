import { TestBed } from '@angular/core/testing';

import { CheckTransactionOrchestrator } from './checks-transaction-orchestrator.service';

describe('ChecksTransactionService', () => {
     let service: CheckTransactionOrchestrator;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(CheckTransactionOrchestrator);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
