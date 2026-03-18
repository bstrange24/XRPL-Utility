import { TestBed } from '@angular/core/testing';

import { CredentialTransactionBuilderService } from './credential-transaction-builder.service';

describe('CredentialTransactionBuilderService', () => {
  let service: CredentialTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
