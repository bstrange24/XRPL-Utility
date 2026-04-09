import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDeleteComponent } from './account-delete.component';

describe('AccountDeleteComponent', () => {
     let component: AccountDeleteComponent;
     let fixture: ComponentFixture<AccountDeleteComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountDeleteComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
