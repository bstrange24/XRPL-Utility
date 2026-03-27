import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelTransactionOptionsComponent } from './payment-channel-transaction-options.component';

describe('PaymentChannelTransactionOptionsComponent', () => {
  let component: PaymentChannelTransactionOptionsComponent;
  let fixture: ComponentFixture<PaymentChannelTransactionOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelTransactionOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelTransactionOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
