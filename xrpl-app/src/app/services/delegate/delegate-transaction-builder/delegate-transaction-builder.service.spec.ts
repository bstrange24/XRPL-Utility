import { TestBed } from '@angular/core/testing';

import { DelegateTransactionBuilderService } from './delegate-transaction-builder.service';

describe('DelegateTransactionBuilderService', () => {
  let service: DelegateTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DelegateTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
