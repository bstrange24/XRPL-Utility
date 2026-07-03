import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanDefaultComponent } from './loan-default.component';

describe('LoanDefaultComponent', () => {
  let component: LoanDefaultComponent;
  let fixture: ComponentFixture<LoanDefaultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanDefaultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanDefaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
