import { TestBed } from '@angular/core/testing';

import { AccountDeleteTransactionBuilderService } from './account-delete-transaction-builder.service';

describe('AccountDeleteTransactionBuilderService', () => {
  let service: AccountDeleteTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountDeleteTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
