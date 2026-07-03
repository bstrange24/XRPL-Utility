import { TestBed } from '@angular/core/testing';

import { VaultTransactionOrchestratorService } from './vault-transaction-orchestrator.service';

describe('VaultTransactionOrchestratorService', () => {
  let service: VaultTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VaultTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
