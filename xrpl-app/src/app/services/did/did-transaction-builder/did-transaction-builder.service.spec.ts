import { TestBed } from '@angular/core/testing';

import { DidTransactionBuilderService } from './did-transaction-builder.service';

describe('DidTransactionBuilderService', () => {
  let service: DidTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DidTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
