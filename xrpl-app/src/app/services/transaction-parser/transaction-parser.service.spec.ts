import { TestBed } from '@angular/core/testing';

import { TransactionParserService } from './transaction-parser.service';

describe('TransactionParserService', () => {
  let service: TransactionParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
