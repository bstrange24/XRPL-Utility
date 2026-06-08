import { TestBed } from '@angular/core/testing';

import { TransactionPreviewParserService } from './transaction-preview-parser.service';

describe('TransactionPreviewParserService', () => {
  let service: TransactionPreviewParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionPreviewParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
