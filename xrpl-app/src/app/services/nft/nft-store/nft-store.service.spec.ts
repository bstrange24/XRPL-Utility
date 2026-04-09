import { TestBed } from '@angular/core/testing';
import { CreateNftStoreService } from './nft-store.service';

describe('NftStoreService', () => {
     let service: InstanceType<typeof CreateNftStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(CreateNftStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
