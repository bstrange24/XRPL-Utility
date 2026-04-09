import { TestBed } from '@angular/core/testing';

import { PaymentChannelStoreService } from './payment-channel-store.service';

describe('PaymentChannelStoreService', () => {
     let service: InstanceType<typeof PaymentChannelStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(PaymentChannelStoreService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
