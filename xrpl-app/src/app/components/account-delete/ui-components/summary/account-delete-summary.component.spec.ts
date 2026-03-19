import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDeleteSummaryComponent } from './account-delete-summary.component';

describe('AccountDeleteSummaryComponent', () => {
     let component: AccountDeleteSummaryComponent;
     let fixture: ComponentFixture<AccountDeleteSummaryComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteSummaryComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountDeleteSummaryComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
