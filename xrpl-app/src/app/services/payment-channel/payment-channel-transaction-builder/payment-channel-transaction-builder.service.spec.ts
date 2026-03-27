import { TestBed } from '@angular/core/testing';

import { PaymentChannelTransactionBuilderService } from './payment-channel-transaction-builder.service';

describe('PaymentChannelTransactionBuilderService', () => {
  let service: PaymentChannelTransactionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelTransactionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
