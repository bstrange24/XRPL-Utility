import { TestBed } from '@angular/core/testing';

import { SendXrpViewModelService } from './send-xrp-view-model.service';

describe('SendXrpViewModelService', () => {
  let service: SendXrpViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendXrpViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
