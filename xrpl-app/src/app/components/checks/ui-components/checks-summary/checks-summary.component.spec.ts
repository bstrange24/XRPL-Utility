import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecksSummaryComponent } from './checks-summary.component';

describe('ChecksSummaryComponent', () => {
  let component: ChecksSummaryComponent;
  let fixture: ComponentFixture<ChecksSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecksSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecksSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
