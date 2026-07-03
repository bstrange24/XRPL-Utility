import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanUnimpairComponent } from './loan-unimpair.component';

describe('LoanUnimpairComponent', () => {
  let component: LoanUnimpairComponent;
  let fixture: ComponentFixture<LoanUnimpairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanUnimpairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanUnimpairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
