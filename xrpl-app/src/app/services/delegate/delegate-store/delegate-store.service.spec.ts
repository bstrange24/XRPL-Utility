import { TestBed } from '@angular/core/testing';

import { DelegateStoreService } from './delegate-store.service';

describe('DelegateStoreService', () => {
  let service: DelegateStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DelegateStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
