import { TestBed } from '@angular/core/testing';

import { ChecksTransactionBuilderService } from './checks-transaction-builder.service';

describe('ChecksTransactionBuilderService', () => {
  let service: ChecksTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecksTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
