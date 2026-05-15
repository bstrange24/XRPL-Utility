import { TestBed } from '@angular/core/testing';

import { RealTimeExpirationService } from './real-time-expiration.service';

describe('RealTimeExpirationService', () => {
  let service: RealTimeExpirationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealTimeExpirationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
