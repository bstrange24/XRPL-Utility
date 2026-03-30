import { TestBed } from '@angular/core/testing';

import { XrplTransactionOrchestratorService } from './xrpl-transaction-orchestrator.service';

describe('XrplTransactionOrchestratorService', () => {
  let service: XrplTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XrplTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
