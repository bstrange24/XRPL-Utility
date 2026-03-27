import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelFlagsComponent } from './payment-channel-flags.component';

describe('PaymentChannelFlagsComponent', () => {
  let component: PaymentChannelFlagsComponent;
  let fixture: ComponentFixture<PaymentChannelFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
