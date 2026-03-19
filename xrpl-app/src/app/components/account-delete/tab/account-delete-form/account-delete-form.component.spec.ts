import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDeleteFormComponent } from './account-delete-form.component';

describe('AccountDeleteFormComponent', () => {
     let component: AccountDeleteFormComponent;
     let fixture: ComponentFixture<AccountDeleteFormComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteFormComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountDeleteFormComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
