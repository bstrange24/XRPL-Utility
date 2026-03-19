import { TestBed } from '@angular/core/testing';

import { PermissionedDomainTransactionBuilderService } from './permissioned-domain-transaction-builder.service';

describe('PermissionedDomainTransactionBuilderService', () => {
  let service: PermissionedDomainTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionedDomainTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
