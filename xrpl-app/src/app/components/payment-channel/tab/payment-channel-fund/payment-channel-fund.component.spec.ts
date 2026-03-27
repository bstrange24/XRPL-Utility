import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelFundComponent } from './payment-channel-fund.component';

describe('PaymentChannelFundComponent', () => {
  let component: PaymentChannelFundComponent;
  let fixture: ComponentFixture<PaymentChannelFundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelFundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelFundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
