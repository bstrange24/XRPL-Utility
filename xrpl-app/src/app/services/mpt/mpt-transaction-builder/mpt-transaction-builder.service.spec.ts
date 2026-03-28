import { TestBed } from '@angular/core/testing';

import { MptTransactionBuilderService } from './mpt-transaction-builder.service';

describe('MptTransactionBuilderService', () => {
  let service: MptTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
