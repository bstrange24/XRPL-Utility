import { TestBed } from '@angular/core/testing';

import { AmmTransactionBuilderService } from './amm-transaction-builder.service';

describe('AmmTransactionBuilderService', () => {
  let service: AmmTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmmTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
