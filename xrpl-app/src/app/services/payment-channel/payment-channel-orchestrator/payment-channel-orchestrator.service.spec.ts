import { TestBed } from '@angular/core/testing';

import { PaymentChannelOrchestratorService } from './payment-channel-orchestrator.service';

describe('PaymentChannelOrchestratorService', () => {
  let service: PaymentChannelOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentChannelOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
