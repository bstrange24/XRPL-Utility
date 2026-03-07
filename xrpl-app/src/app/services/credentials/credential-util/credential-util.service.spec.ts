import { TestBed } from '@angular/core/testing';

import { CredentialUtilService } from './credential-util.service';

describe('CredentialUtilService', () => {
  let service: CredentialUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
