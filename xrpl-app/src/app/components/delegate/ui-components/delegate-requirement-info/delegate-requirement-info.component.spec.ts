import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroInformationCircle } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

import { DelegateRequirementInfoComponent } from './delegate-requirement-info.component';

describe('DelegateRequirementInfoComponent', () => {
     let component: DelegateRequirementInfoComponent;
     let fixture: ComponentFixture<DelegateRequirementInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [DelegateRequirementInfoComponent],
               providers: [provideNoopAnimations(), provideIcons({ heroInformationCircle }), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          }).compileComponents();

          fixture = TestBed.createComponent(DelegateRequirementInfoComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should show a down chevron when collapsed and expand on click', () => {
          expect(component.isExpanded()).toBeFalse();
          expect(fixture.debugElement.query(By.css('lucide-icon')).componentInstance.name).toBe('chevron-down');

          fixture.nativeElement.querySelector('button').click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeTrue();
          expect(fixture.debugElement.query(By.css('lucide-icon')).componentInstance.name).toBe('chevron-up');
          expect(fixture.nativeElement.textContent).toContain('Granting permissions');
     });
});
