import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanDeleteComponent } from './loan-delete.component';

describe('LoanDeleteComponent', () => {
     let component: LoanDeleteComponent;
     let fixture: ComponentFixture<LoanDeleteComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [LoanDeleteComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(LoanDeleteComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
