import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialsSummaryComponent } from './credentials-summary.component';

describe('CredentialsSummaryComponent', () => {
     let component: CredentialsSummaryComponent;
     let fixture: ComponentFixture<CredentialsSummaryComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CredentialsSummaryComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(CredentialsSummaryComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
