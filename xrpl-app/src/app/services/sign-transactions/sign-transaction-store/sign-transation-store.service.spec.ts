import { TestBed } from '@angular/core/testing';

import { SignTransationStoreService } from './sign-transation-store.service';

describe('SignTransationStoreService', () => {
     let service: InstanceType<typeof SignTransationStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(SignTransationStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
