import { TestBed } from '@angular/core/testing';

import { TimeBasedEscrowOrchestrator } from './escrow-orchestrator.service';

describe('TimeBasedEscrowOrchestrator', () => {
     let service: TimeBasedEscrowOrchestrator;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(TimeBasedEscrowOrchestrator);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
