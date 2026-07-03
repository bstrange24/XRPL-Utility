import { TestBed } from '@angular/core/testing';

import { VaultDepositValidatorService } from './vault-deposit-validator.service';

describe('VaultDepositValidatorService', () => {
  let service: VaultDepositValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VaultDepositValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
