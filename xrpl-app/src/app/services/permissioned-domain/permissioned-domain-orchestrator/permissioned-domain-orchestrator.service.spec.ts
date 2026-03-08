import { TestBed } from '@angular/core/testing';

import { PermissionedDomainOrchestratorService } from './permissioned-domain-orchestrator.service';

describe('PermissionedDomainOrchestratorService', () => {
  let service: PermissionedDomainOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionedDomainOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
