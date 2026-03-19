import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountDeleteRequirementsInfoComponent } from './account-delete-requirements-info.component';

describe('AccountDeleteRequirementsInfoComponent', () => {
     let component: AccountDeleteRequirementsInfoComponent;
     let fixture: ComponentFixture<AccountDeleteRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteRequirementsInfoComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountDeleteRequirementsInfoComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
