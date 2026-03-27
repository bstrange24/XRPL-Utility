import { TestBed } from '@angular/core/testing';

import { PaymentChannelViewModelService } from './payment-channel-view-model.service';

describe('PaymentChannelViewModelService', () => {
  let service: PaymentChannelViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
