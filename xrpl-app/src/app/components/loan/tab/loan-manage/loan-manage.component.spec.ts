import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LooanManageComponent } from './loan-manage.component';

describe('LendingManageComponent', () => {
     let component: LooanManageComponent;
     let fixture: ComponentFixture<LooanManageComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [LooanManageComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(LooanManageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
