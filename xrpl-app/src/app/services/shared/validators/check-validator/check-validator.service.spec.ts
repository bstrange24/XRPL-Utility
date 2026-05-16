import { TestBed } from '@angular/core/testing';

import { CheckValidatorService } from './check-validator.service';

describe('CheckValidatorService', () => {
  let service: CheckValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
