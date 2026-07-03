import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanBrokerSummaryComponent } from './loan-broker-summary.component';

describe('LoanBrokerSummaryComponent', () => {
  let component: LoanBrokerSummaryComponent;
  let fixture: ComponentFixture<LoanBrokerSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanBrokerSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanBrokerSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
