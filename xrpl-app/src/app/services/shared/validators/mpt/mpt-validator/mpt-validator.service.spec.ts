import { TestBed } from '@angular/core/testing';

import { MptValidatorService } from './mpt-validator.service';

describe('MptValidatorService', () => {
  let service: MptValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
