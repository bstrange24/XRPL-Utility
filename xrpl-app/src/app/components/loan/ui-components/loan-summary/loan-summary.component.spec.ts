import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingSummaryComponent } from './lending-summary.component';

describe('LendingSummaryComponent', () => {
  let component: LendingSummaryComponent;
  let fixture: ComponentFixture<LendingSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
