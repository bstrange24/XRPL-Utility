import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabMenuWithInfoComponent } from './tab-with-info.component';

describe('TabWithInfoComponent', () => {
     let component: TabMenuWithInfoComponent;
     let fixture: ComponentFixture<TabMenuWithInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TabMenuWithInfoComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(TabMenuWithInfoComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
