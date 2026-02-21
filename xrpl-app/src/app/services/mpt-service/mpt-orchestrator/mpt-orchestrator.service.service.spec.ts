import { TestBed } from '@angular/core/testing';

import { MptOrchestratorServiceService } from './mpt-orchestrator.service.service';

describe('MptOrchestratorServiceService', () => {
  let service: MptOrchestratorServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptOrchestratorServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
