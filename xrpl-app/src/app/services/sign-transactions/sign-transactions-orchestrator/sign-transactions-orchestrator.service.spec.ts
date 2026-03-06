import { TestBed } from '@angular/core/testing';

import { SignTransactionsOrchestratorService } from './sign-transactions-orchestrator.service';

describe('SignTransactionsOrchestratorService', () => {
  let service: SignTransactionsOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignTransactionsOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
