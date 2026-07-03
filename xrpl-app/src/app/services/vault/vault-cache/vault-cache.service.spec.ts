import { TestBed } from '@angular/core/testing';

import { VaultCacheService } from './vault-cache.service';

describe('VaultCacheService', () => {
  let service: VaultCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VaultCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
