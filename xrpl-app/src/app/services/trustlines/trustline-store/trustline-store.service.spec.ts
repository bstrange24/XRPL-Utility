import { TestBed } from '@angular/core/testing';

import { TrustlineStoreService } from './trustline-store.service';

describe('TrustlineStoreService', () => {
  let service: TrustlineStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
