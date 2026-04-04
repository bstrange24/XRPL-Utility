import { TestBed } from '@angular/core/testing';

import { AmmTransactionOrchestratorService } from './amm-transaction-orchestrator.service';

describe('AmmTransactionOrchestratorService', () => {
  let service: AmmTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmmTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
