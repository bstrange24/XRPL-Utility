import { TestBed } from '@angular/core/testing';

import { MptAuthorizeValidatorService } from './mpt-authorize-validator.service';

describe('MptAuthorizeValidatorService', () => {
  let service: MptAuthorizeValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptAuthorizeValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
