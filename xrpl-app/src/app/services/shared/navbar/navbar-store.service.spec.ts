import { TestBed } from '@angular/core/testing';

import { NavbarStoreService } from './navbar-store.service';

describe('NavbarStoreService', () => {
  let service: NavbarStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavbarStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
