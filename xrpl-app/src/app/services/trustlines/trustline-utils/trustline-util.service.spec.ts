import { TestBed } from '@angular/core/testing';

import { TrustlineUtilService } from './trustline-util.service';

describe('TrustlineUtilService', () => {
  let service: TrustlineUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
