import { TestBed } from '@angular/core/testing';

import { XrplTransactionExecutorService } from './xrpl-transaction-executor.service';

describe('XrplTransactionExecutorService', () => {
  let service: XrplTransactionExecutorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XrplTransactionExecutorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
