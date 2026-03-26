import { TestBed } from '@angular/core/testing';

import { TrustlineTransactionOrchestratorService } from './trustline-transaction-orchestrator.service';

describe('TrustlineTransactionOrchestratorService', () => {
  let service: TrustlineTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
