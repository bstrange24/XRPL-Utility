import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketsRequirementsInfoComponent } from './tickets-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('TicketsRequirementsInfoComponent', () => {
     let component: TicketsRequirementsInfoComponent;
     let fixture: ComponentFixture<TicketsRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TicketsRequirementsInfoComponent],
               providers: [
                    provideNoopAnimations(),

                    // lucide icon registry
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

          fixture = TestBed.createComponent(TicketsRequirementsInfoComponent);
          component = fixture.componentInstance;

          // REQUIRED input signal
          fixture.componentRef.setInput('activeTab', 'createTicket');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should toggle expansion state when header clicked', () => {
          const initial = component.isExpanded();

          const button = fixture.nativeElement.querySelector('button');
          button.click();

          fixture.detectChanges();

          expect(component.isExpanded()).toBe(!initial);
     });

     it('should show content when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const content = fixture.nativeElement.querySelector('.space-y-6.overflow-hidden');
          expect(content).not.toBeNull();
     });
});
