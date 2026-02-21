import { TestBed } from '@angular/core/testing';

import { SendXrpTransactionOrchestratorService } from './send-xrp-transaction-orchestrator.service';

describe('SendXrpTransactionOrchestratorService', () => {
  let service: SendXrpTransactionOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendXrpTransactionOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
