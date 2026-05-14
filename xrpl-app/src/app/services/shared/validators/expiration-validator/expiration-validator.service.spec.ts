import { TestBed } from '@angular/core/testing';

import { ExpirationValidatorService } from './expiration-validator.service';

describe('ExpirationValidatorService', () => {
  let service: ExpirationValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpirationValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
