import { TestBed } from '@angular/core/testing';

import { CopyUtilService } from './copy-util.service';

describe('CopyUtilService', () => {
  let service: CopyUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CopyUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
