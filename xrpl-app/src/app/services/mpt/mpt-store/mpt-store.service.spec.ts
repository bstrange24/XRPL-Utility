import { TestBed } from '@angular/core/testing';
import { MptStoreService } from './mpt-store.service';

describe('MptStoreService', () => {
     let service: InstanceType<typeof MptStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(MptStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
