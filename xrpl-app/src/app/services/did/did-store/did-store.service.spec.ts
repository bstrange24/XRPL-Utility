import { TestBed } from '@angular/core/testing';

import { DidStoreService } from './did-store.service';

describe('DidStoreService', () => {
     let service: InstanceType<typeof DidStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(DidStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
