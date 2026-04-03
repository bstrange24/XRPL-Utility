import { TestBed } from '@angular/core/testing';

import { NftOrchestratorService } from './nft-orchestrator.service';

describe('NftOrchestratorService', () => {
  let service: NftOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
