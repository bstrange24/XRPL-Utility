import { TestBed } from '@angular/core/testing';

import { WalletsStoreService } from './wallets-store.service';
describe('WalletsStoreService', () => {
     let service: InstanceType<typeof WalletsStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(WalletsStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
