import { TestBed } from '@angular/core/testing';

import { TrustlineOrchestratorService } from './trustline-orchestrator.service';

describe('TrustlineOrchestratorService', () => {
  let service: TrustlineOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
