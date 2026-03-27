import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelClaimComponent } from './payment-channel-claim.component';

describe('PaymentChannelClaimComponent', () => {
  let component: PaymentChannelClaimComponent;
  let fixture: ComponentFixture<PaymentChannelClaimComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelClaimComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelClaimComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
