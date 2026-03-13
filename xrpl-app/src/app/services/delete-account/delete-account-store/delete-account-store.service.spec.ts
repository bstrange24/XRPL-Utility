import { TestBed } from '@angular/core/testing';

import { DeleteAccountStoreService } from './delete-account-store.service';

describe('DeleteAccountStoreService', () => {
  let service: DeleteAccountStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteAccountStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
