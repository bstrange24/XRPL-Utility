import { TestBed } from '@angular/core/testing';

import { AccountDeleteStoreService } from './account-delete-store.service';

describe('AccountDeleteStoreService', () => {
     let service: InstanceType<typeof AccountDeleteStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(AccountDeleteStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
