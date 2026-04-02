import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MptAuthorizeUnauthorizeComponent } from './mpt-authorize-unauthorize.component';

describe('MptAuthorizeUnauthorizeComponent', () => {
     let component: MptAuthorizeUnauthorizeComponent;
     let fixture: ComponentFixture<MptAuthorizeUnauthorizeComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [MptAuthorizeUnauthorizeComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(MptAuthorizeUnauthorizeComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
