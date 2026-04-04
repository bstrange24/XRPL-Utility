import { TestBed } from '@angular/core/testing';

import { AmmStoreService } from './amm-store.service';

describe('AmmStoreService', () => {
  let service: AmmStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmmStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
