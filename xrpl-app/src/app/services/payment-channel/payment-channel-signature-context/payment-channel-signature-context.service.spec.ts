import { TestBed } from '@angular/core/testing';

import { PaymentChannelSignatureContextService } from './payment-channel-signature-context.service';

describe('PaymentChannelSignatureContextService', () => {
  let service: PaymentChannelSignatureContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelSignatureContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
