import { TestBed } from '@angular/core/testing';

import { DomainIdValidatorService } from './domain-id-validator.service';

describe('DomainIdValidatorService', () => {
  let service: DomainIdValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DomainIdValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
