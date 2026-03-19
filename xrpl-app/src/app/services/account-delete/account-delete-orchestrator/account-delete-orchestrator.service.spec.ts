import { TestBed } from '@angular/core/testing';

import { AccountDeleteOrchestratorService } from './account-delete-orchestrator.service';

describe('AccountDeleteOrchestratorService', () => {
     let service: AccountDeleteOrchestratorService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(AccountDeleteOrchestratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
