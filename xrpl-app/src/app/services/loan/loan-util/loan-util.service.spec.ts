import { TestBed } from '@angular/core/testing';

import { LoanUtilService } from './loan-util.service';

describe('LoanUtilService', () => {
     let service: LoanUtilService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(LoanUtilService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
