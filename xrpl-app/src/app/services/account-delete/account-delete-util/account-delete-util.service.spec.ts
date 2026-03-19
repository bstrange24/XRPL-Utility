import { TestBed } from '@angular/core/testing';

import { AccountDeleteUtilService } from './account-delete-util.service';

describe('AccountDeleteUtilService', () => {
     let service: AccountDeleteUtilService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(AccountDeleteUtilService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
