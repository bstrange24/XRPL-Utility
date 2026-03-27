import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelRenewComponent } from './payment-channel-renew.component';

describe('PaymentChannelRenewComponent', () => {
  let component: PaymentChannelRenewComponent;
  let fixture: ComponentFixture<PaymentChannelRenewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelRenewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelRenewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
