import { TestBed } from '@angular/core/testing';

import { CredentialStoreService } from './credential-store.service';

describe('CredentialStoreService', () => {
  let service: CredentialStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
