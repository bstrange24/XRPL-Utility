import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AmmRequirementsInfoComponent } from './amm-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/compiler';
import { provideRouter, ActivatedRoute } from '@angular/router';

describe('AmmRequirementsInfoComponent', () => {
     let component: AmmRequirementsInfoComponent;
     let fixture: ComponentFixture<AmmRequirementsInfoComponent>;

     let route: any;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AmmRequirementsInfoComponent],
               providers: [
                    provideNoopAnimations(),
                    provideRouter([]),
                    { provide: ActivatedRoute, useValue: route },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },

                    provideIcons({
                         heroExclamationTriangle,
                         heroClock,
                         heroChevronDown,
                         heroInformationCircle,
                         heroMagnifyingGlass,
                    }),
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AmmRequirementsInfoComponent);
          component = fixture.componentInstance;

          // IMPORTANT: satisfy required input signal
          fixture.componentRef.setInput('activeTab', 'createAMM');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should toggle expanded state when header button is clicked', () => {
          const initial = component.isExpanded();

          // first button is the toggle header (not inner chevron button)
          const btn = fixture.nativeElement.querySelector('button');

          btn.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBe(!initial);
     });

     it('should render collapsible content when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const content = fixture.nativeElement.querySelector('.space-y-6.overflow-hidden');
          expect(content).not.toBeNull();
     });
});
