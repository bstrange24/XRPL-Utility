import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EscrowRequirementsInfoComponent } from './escrow-requirements-info.component';

describe('EscrowRequirementsInfoComponent', () => {
     let component: EscrowRequirementsInfoComponent;
     let fixture: ComponentFixture<EscrowRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowRequirementsInfoComponent],
          })
               .overrideComponent(EscrowRequirementsInfoComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowRequirementsInfoComponent);
          component = fixture.componentInstance;
          fixture.componentRef.setInput('page', true);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should accept page = true', () => {
          fixture.componentRef.setInput('page', true);
          fixture.detectChanges();
          expect(component.page()).toBeTrue();
     });

     it('should accept page = false', () => {
          fixture.componentRef.setInput('page', false);
          fixture.detectChanges();
          expect(component.page()).toBeFalse();
     });
});
