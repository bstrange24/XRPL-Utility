import { TestBed } from '@angular/core/testing';

import { SignTransactionValidatorService } from './sign-transaction-validator.service';

describe('SignTransactionValidatorService', () => {
  let service: SignTransactionValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignTransactionValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
