import { TestBed } from '@angular/core/testing';

import { TicketsTransactionBuilderService } from './tickets-transaction-builder.service';

describe('TicketsTransactionBuilderService', () => {
  let service: TicketsTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
