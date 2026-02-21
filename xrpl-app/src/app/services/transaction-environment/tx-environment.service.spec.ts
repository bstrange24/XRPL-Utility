import { TestBed } from '@angular/core/testing';

import { TxEnvironmentService } from './tx-environment.service';

describe('TxEnvironmentService', () => {
     let service: TxEnvironmentService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(TxEnvironmentService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
