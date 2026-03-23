import { TestBed } from '@angular/core/testing';

import { SendXrpTransactionBuilderService } from './send-xrp-transaction-builder.service';

describe('SendXrpTransactionBuilderService', () => {
  let service: SendXrpTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendXrpTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
