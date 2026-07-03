import { TestBed } from '@angular/core/testing';

import { LoanStoreService } from './loan-store.service';

describe('LoanStoreService', () => {
     let service: LoanStoreService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(LoanStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
