import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentChannelRequirementsInfoComponent } from './payment-channel-requirements-info.component';

describe('PaymentChannelRequirementsInfoComponent', () => {
  let component: PaymentChannelRequirementsInfoComponent;
  let fixture: ComponentFixture<PaymentChannelRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentChannelRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentChannelRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
