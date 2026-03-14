import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorStoreService } from './Account-configurator-store.service';

describe('CcountConfiguratorStoreService', () => {
  let service: AccountConfiguratorStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountConfiguratorStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
