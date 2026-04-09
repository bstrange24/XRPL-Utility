import { TestBed } from '@angular/core/testing';

import { NftTransactionOrchestrator } from './nft-orchestrator.service';

describe('NftTransactionOrchestrator', () => {
     let service: NftTransactionOrchestrator;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(NftTransactionOrchestrator);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
