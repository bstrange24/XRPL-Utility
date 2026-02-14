import { TestBed } from '@angular/core/testing';

import { TransactionDropdownService } from './transaction-dropdown.service';

describe('TransactionDropdownService', () => {
  let service: TransactionDropdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionDropdownService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
