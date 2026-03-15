import { TestBed } from '@angular/core/testing';

import { AccountConfiguratorViewModelService } from './account-configurator-view-model.service';

describe('CcountConfiguratorViewModelService', () => {
     let service: AccountConfiguratorViewModelService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(AccountConfiguratorViewModelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
