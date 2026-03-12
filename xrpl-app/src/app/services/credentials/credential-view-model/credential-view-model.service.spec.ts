import { TestBed } from '@angular/core/testing';

import { CredentialViewModelService } from './credential-view-model.service';

describe('CredentialViewModelService', () => {
  let service: CredentialViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
