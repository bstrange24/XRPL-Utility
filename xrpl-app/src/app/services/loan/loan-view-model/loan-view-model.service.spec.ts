import { TestBed } from '@angular/core/testing';

import { LoanViewModelService } from './loan-view-model.service';

describe('LoanViewModelService', () => {
     let service: LoanViewModelService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(LoanViewModelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
