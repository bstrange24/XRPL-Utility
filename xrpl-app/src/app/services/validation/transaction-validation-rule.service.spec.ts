import { TestBed } from '@angular/core/testing';

import { TxInputValidationService } from './transaction-validation-rule.service';

describe('TxInputValidationService', () => {
     let service: TxInputValidationService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(TxInputValidationService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
