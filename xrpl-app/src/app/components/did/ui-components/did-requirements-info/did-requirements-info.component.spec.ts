import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { DidRequirementsInfoComponent } from './did-requirements-info.component';

describe('DidRequirementsInfoComponent', () => {
     let component: DidRequirementsInfoComponent;
     let fixture: ComponentFixture<DidRequirementsInfoComponent>;
     let el: HTMLElement;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [DidRequirementsInfoComponent],
               providers: [
                    provideNoopAnimations(),
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

          fixture = TestBed.createComponent(DidRequirementsInfoComponent);
          component = fixture.componentInstance;

          // REQUIRED input (even if not used in template yet)
          fixture.componentRef.setInput('activeTab', 'setDid');

          fixture.detectChanges();
          el = fixture.nativeElement as HTMLElement;
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('initial state', () => {
          it('should start collapsed', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should not render collapsible content when collapsed', () => {
               expect(el.textContent).not.toContain('Create / Update DID');
               expect(el.textContent).not.toContain('Delete DID');
               expect(el.textContent).not.toContain('Important Notes');
          });

          it('should show Expand label', () => {
               expect(el.textContent).toContain('Expand');
          });
     });

     describe('toggle behavior', () => {
          it('should expand when header is clicked', () => {
               const headerButton = el.querySelector('button') as HTMLButtonElement;

               headerButton.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeTrue();
          });

          it('should collapse when clicked twice', () => {
               const headerButton = el.querySelector('button') as HTMLButtonElement;

               headerButton.click();
               headerButton.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeFalse();
          });

          it('should show Collapse label when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(el.textContent).toContain('Collapse');
          });
     });

     describe('expanded content', () => {
          beforeEach(() => {
               component.isExpanded.set(true);
               fixture.detectChanges();
          });

          it('should render DID sections', () => {
               expect(el.textContent).toContain('Create / Update DID');
               expect(el.textContent).toContain('Delete DID');
          });

          it('should render DID fields', () => {
               expect(el.textContent).toContain('DID Document');
               expect(el.textContent).toContain('URI');
               expect(el.textContent).toContain('Flags');
               expect(el.textContent).toContain('Account Authorization');
          });

          it('should render important notes', () => {
               expect(el.textContent).toContain('DID amendment');
               expect(el.textContent).toContain('owner reserve');
               expect(el.textContent).toContain('publicly readable');
          });

          it('should render important considerations', () => {
               expect(el.textContent).toContain('Important Considerations');
               expect(el.textContent).toContain('Losing your account keys');
               expect(el.textContent).toContain('avoid sensitive information');
          });
     });

     describe('icons', () => {
          it('should render header ng-icon', () => {
               const icon = el.querySelector('ng-icon');
               expect(icon).toBeTruthy();
          });

          it('should render lucide toggle icon', () => {
               const icon = el.querySelector('lucide-icon');
               expect(icon).toBeTruthy();
          });
     });

     describe('input handling', () => {
          it('should accept activeTab input', () => {
               expect(component.activeTab()).toBe('setDid');

               fixture.componentRef.setInput('activeTab', 'deleteDid');
               fixture.detectChanges();

               expect(component.activeTab()).toBe('deleteDid');
          });
     });

     describe('stability', () => {
          it('should not break on rapid toggling', () => {
               for (let i = 0; i < 10; i++) {
                    component.isExpanded.set(!component.isExpanded());
               }

               fixture.detectChanges();

               expect(typeof component.isExpanded()).toBe('boolean');
          });

          it('should not throw during change detection when expanded', () => {
               component.isExpanded.set(true);
               expect(() => fixture.detectChanges()).not.toThrow();
          });
     });
});
