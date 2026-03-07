import { TestBed } from '@angular/core/testing';

import { CredentialTransactionOrchestratorService } from './credential-transaction-orchestrator.service';

describe('CredentialTransactionOrchestratorService', () => {
  let service: CredentialTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
