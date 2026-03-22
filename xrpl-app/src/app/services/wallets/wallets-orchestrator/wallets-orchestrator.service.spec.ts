import { TestBed } from '@angular/core/testing';

import { WalletsOrchestratorService } from './wallets-orchestrator.service';

describe('WalletsOrchestratorService', () => {
  let service: WalletsOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletsOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
