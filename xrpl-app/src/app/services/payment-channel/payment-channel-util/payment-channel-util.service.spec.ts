import { TestBed } from '@angular/core/testing';

import { PaymentChannelUtilService } from './payment-channel-util.service';

describe('PaymentChannelUtilService', () => {
  let service: PaymentChannelUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
