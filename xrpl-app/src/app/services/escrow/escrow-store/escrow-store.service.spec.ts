import { TestBed } from '@angular/core/testing';

import { EscrowStoreService } from './escrow-store.service';

describe('EscrowStoreService', () => {
  let service: EscrowStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscrowStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
