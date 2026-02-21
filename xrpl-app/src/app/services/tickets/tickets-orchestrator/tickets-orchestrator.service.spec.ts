import { TestBed } from '@angular/core/testing';
import { TicketsOrchestratorService } from './tickets-orchestrator.service';

describe('TicketsOrchestratorService', () => {
     let service: TicketsOrchestratorService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(TicketsOrchestratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
