import { TestBed } from '@angular/core/testing';
import { CredentialStore } from './credential-store.service';

describe('CredentialStoreService', () => {
     let service: InstanceType<typeof CredentialStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(CredentialStore);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
