import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorTransactionBuilderService } from './account-configurator-transaction-builder.service';

describe('AccountConfiguratorTransactionBuilderService', () => {
  let service: AccountConfiguratorTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountConfiguratorTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
