import { TestBed } from '@angular/core/testing';

import { PermissionedDomainStoreService } from './permissioned-domain-store.service';

describe('PermissionDomainStoreService', () => {
     let service: InstanceType<typeof PermissionedDomainStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(PermissionedDomainStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
