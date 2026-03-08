import { TestBed } from '@angular/core/testing';

import { DidTransactionOrchestratorService } from './did-transaction-orchestrator.service';

describe('DidTransactionOrchestratorService', () => {
  let service: DidTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DidTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
