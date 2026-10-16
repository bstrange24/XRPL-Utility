import { TestBed } from '@angular/core/testing';

import { LoanStoreService } from './loan-store.service';

describe('LoanStoreService', () => {
     let service: InstanceType<typeof LoanStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(LoanStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     it('clears form selections without clearing the loaded loans', () => {
          const loans = [{ index: 'loan-1' }] as any;
          service.setField('existingLoans', loans);
          service.setField('selectedLoanId', 'loan-1');
          service.setField('manuallyFetchedLoan', loans[0]);
          service.setField('principalRequested', '100');

          service.resetFormFields();

          expect(service.selectedLoanId()).toBeNull();
          expect(service.manuallyFetchedLoan()).toBeNull();
          expect(service.principalRequested()).toBe('');
          expect(service.existingLoans()).toBe(loans);
     });
});
