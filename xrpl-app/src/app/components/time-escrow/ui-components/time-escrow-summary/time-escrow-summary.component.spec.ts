import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeEscrowSummaryComponent } from './time-escrow-summary.component';

describe('TimeEscrowSummaryComponent', () => {
  let component: TimeEscrowSummaryComponent;
  let fixture: ComponentFixture<TimeEscrowSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeEscrowSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeEscrowSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
