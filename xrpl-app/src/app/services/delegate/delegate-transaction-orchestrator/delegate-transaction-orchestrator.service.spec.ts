import { TestBed } from '@angular/core/testing';

import { DelegateTransactionOrchestratorService } from './delegate-transaction-orchestrator.service';

describe('DelegateTransactionOrchestratorService', () => {
  let service: DelegateTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DelegateTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
