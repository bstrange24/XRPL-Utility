import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPayComponent } from './loan-pay.component';

describe('LendingPayComponent', () => {
     let component: LoanPayComponent;
     let fixture: ComponentFixture<LoanPayComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [LoanPayComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(LoanPayComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
