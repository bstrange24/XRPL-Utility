import { TestBed } from '@angular/core/testing';

import { PaymentChannelValidatorService } from './payment-channel-validator.service';

describe('PaymentChannelValidatorService', () => {
  let service: PaymentChannelValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
