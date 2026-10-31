import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanManageComponent } from './loan-manage.component';

describe('LendingManageComponent', () => {
     let component: LoanManageComponent;
     let fixture: ComponentFixture<LoanManageComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [LoanManageComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(LoanManageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
