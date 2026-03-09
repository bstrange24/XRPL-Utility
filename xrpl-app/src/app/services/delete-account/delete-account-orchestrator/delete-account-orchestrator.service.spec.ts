import { TestBed } from '@angular/core/testing';

import { DeleteAccountOrchestratorService } from './delete-account-orchestrator.service';

describe('DeleteAccountOrchestratorService', () => {
  let service: DeleteAccountOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteAccountOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
