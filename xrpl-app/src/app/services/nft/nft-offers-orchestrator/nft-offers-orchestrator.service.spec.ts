import { TestBed } from '@angular/core/testing';

import { NftOffersOrchestratorService } from './nft-offers-orchestrator.service';

describe('NftOffersOrchestratorService', () => {
  let service: NftOffersOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftOffersOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
