import { TestBed } from '@angular/core/testing';

import { SendXrpUtilService } from './send-xrp-util.service';

describe('SendXrpUtilService', () => {
  let service: SendXrpUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendXrpUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
