import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanSummaryComponent } from './loan-summary.component';

describe('LoanSummaryComponent', () => {
  let component: LoanSummaryComponent;
  let fixture: ComponentFixture<LoanSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
