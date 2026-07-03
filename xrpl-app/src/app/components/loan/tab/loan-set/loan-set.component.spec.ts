import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanSetComponent } from './loan-set.component';

describe('LoanSetComponent', () => {
     let component: LoanSetComponent;
     let fixture: ComponentFixture<LoanSetComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [LoanSetComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(LoanSetComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
