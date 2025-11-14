import { TestBed } from '@angular/core/testing';

import { TransactionUiService } from './transaction-ui.service';

describe('TransactionUiService', () => {
  let service: TransactionUiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionUiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
