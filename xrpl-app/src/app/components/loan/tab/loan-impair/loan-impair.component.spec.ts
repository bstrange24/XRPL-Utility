import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanImpairComponent } from './loan-impair.component';

describe('LoanImpairComponent', () => {
  let component: LoanImpairComponent;
  let fixture: ComponentFixture<LoanImpairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanImpairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanImpairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
