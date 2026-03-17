import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorStoreService } from './account-configurator-store.service';

describe('AccountConfiguratorStoreService', () => {
  let service: AccountConfiguratorStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountConfiguratorStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
