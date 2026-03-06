import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorOrchestratorService } from './account-configurator-orchestrator.service';

describe('AccountConfiguratorOrchestratorService', () => {
  let service: AccountConfiguratorOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountConfiguratorOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
