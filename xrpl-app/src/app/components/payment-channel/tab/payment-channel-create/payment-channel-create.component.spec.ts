import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelCreateComponent } from './payment-channel-create.component';

describe('PaymentChannelCreateComponent', () => {
  let component: PaymentChannelCreateComponent;
  let fixture: ComponentFixture<PaymentChannelCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
