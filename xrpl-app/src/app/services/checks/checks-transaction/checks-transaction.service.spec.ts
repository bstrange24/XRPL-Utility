import { TestBed } from '@angular/core/testing';

import { ChecksTransactionService } from './checks-transaction.service';

describe('ChecksTransactionService', () => {
  let service: ChecksTransactionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecksTransactionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
