import { TestBed } from '@angular/core/testing';

import { MptSendValidatorService } from './mpt-send-validator.service';

describe('MptSendValidatorService', () => {
  let service: MptSendValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptSendValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
