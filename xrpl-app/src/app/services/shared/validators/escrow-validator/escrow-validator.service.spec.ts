import { TestBed } from '@angular/core/testing';

import { EscrowValidatorService } from './escrow-validator.service';

describe('EscrowValidatorService', () => {
  let service: EscrowValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscrowValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
