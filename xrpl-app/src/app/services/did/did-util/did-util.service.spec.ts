import { TestBed } from '@angular/core/testing';

import { DidUtilService } from './did-util.service';

describe('DidUtilService', () => {
  let service: DidUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DidUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
