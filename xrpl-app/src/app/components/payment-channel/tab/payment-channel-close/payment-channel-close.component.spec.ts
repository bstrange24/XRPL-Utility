import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelCloseComponent } from './payment-channel-close.component';

describe('PaymentChannelCloseComponent', () => {
  let component: PaymentChannelCloseComponent;
  let fixture: ComponentFixture<PaymentChannelCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelCloseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
