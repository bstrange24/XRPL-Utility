import { TestBed } from '@angular/core/testing';

import { ChecksStoreService } from './checks-store.service';

describe('ChecksStoreService', () => {
  let service: ChecksStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecksStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
