import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutionTimeDisplayComponent } from './execution-time.component';

describe('ExecutionTimeComponent', () => {
     let component: ExecutionTimeDisplayComponent;
     let fixture: ComponentFixture<ExecutionTimeDisplayComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ExecutionTimeDisplayComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(ExecutionTimeDisplayComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
