import { TestBed } from '@angular/core/testing';

import { DelegateUtilService } from './delegate-util.service';

describe('DelegateUtilService', () => {
  let service: DelegateUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DelegateUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
