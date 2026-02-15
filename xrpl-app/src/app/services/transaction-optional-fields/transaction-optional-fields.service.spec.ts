import { TestBed } from '@angular/core/testing';

import { TransactionOptionalFieldsService } from './transaction-optional-fields.service';

describe('TransactionOptionalFieldsService', () => {
  let service: TransactionOptionalFieldsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionOptionalFieldsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
