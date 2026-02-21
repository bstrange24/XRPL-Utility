import { TestBed } from '@angular/core/testing';

import { EscrowUtilService } from './escrow-util.service';

describe('EscrowUtilService', () => {
  let service: EscrowUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscrowUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
