import { TestBed } from '@angular/core/testing';

import { MptUtilService } from './mpt-util.service';

describe('MptUtilService', () => {
  let service: MptUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
