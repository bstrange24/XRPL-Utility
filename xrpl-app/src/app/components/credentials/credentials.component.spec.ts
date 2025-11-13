import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCredentialsComponent } from './credentials.component';

describe('CreateCredentialsComponent', () => {
     let component: CreateCredentialsComponent;
     let fixture: ComponentFixture<CreateCredentialsComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CreateCredentialsComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(CreateCredentialsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
