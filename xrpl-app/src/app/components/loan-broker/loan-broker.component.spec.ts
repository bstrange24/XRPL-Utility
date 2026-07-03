import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanBrokerComponent } from './loan-broker.component';

describe('LoanBrokerComponent', () => {
  let component: LoanBrokerComponent;
  let fixture: ComponentFixture<LoanBrokerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanBrokerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanBrokerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
