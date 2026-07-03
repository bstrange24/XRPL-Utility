import { TestBed } from '@angular/core/testing';

import { VaultStoreService } from './vault-store.service';

describe('VaultStoreService', () => {
  let service: VaultStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VaultStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
