import { TestBed } from '@angular/core/testing';
import { NavbarStore } from './navbar-store.service';

describe('NavbarStoreService', () => {
     let service: InstanceType<typeof NavbarStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(NavbarStore);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
