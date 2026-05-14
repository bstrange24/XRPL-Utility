import { TestBed } from '@angular/core/testing';

import { AmountValidatorService } from './amount-validator.service';

describe('AmountValidatorService', () => {
  let service: AmountValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmountValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
