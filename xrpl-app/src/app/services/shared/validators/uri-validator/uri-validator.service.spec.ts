import { TestBed } from '@angular/core/testing';

import { UriValidatorService } from './uri-validator.service';

describe('UriValidatorService', () => {
  let service: UriValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UriValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
