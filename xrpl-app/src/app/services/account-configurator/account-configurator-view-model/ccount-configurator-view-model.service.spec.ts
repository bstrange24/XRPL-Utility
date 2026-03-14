import { TestBed } from '@angular/core/testing';

import { CcountConfiguratorViewModelService } from './ccount-configurator-view-model.service';

describe('CcountConfiguratorViewModelService', () => {
  let service: CcountConfiguratorViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CcountConfiguratorViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
