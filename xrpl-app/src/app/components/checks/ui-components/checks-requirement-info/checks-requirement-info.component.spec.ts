import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChecksRequirementInfoComponent } from './checks-requirement-info.component';

describe('ChecksRequirementInfoComponent', () => {
     let component: ChecksRequirementInfoComponent;
     let fixture: ComponentFixture<ChecksRequirementInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksRequirementInfoComponent],
          })
               .overrideComponent(ChecksRequirementInfoComponent, { set: { template: '<div>requirement info</div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksRequirementInfoComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
