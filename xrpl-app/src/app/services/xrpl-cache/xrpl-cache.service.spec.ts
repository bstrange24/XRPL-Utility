import { TestBed } from '@angular/core/testing';

import { XrplCacheService } from './xrpl-cache.service';

describe('XrplCacheService', () => {
  let service: XrplCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XrplCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
