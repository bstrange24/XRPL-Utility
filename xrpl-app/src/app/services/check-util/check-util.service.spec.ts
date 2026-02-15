import { TestBed } from '@angular/core/testing';

import { CheckUtilService } from './check-util.service';

describe('CheckUtilService', () => {
  let service: CheckUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
