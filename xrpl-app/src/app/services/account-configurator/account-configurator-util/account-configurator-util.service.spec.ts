import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorUtilService } from './account-configurator-util.service';

describe('AccountConfiguratorUtilService', () => {
  let service: AccountConfiguratorUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountConfiguratorUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
