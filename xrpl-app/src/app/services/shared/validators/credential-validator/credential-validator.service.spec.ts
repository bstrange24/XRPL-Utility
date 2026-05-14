import { TestBed } from '@angular/core/testing';

import { CredentialValidatorService } from './credential-validator.service';

describe('CredentialValidatorService', () => {
  let service: CredentialValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
