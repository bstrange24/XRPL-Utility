import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Signal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroChevronUp, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

import { RequirementsInfoComponent } from './requirements-info.component';

describe('RequirementsInfoComponent', () => {
     let component: RequirementsInfoComponent;
     let fixture: ComponentFixture<RequirementsInfoComponent>;
     let mockActiveTabValue: 'setPermissionedDomain' | 'deletePermissionedDomain';
     let mockActiveTabSignal: Signal<'setPermissionedDomain' | 'deletePermissionedDomain'>;

     beforeEach(async () => {
          // Create the signal that will be returned
          mockActiveTabValue = 'setPermissionedDomain';
          mockActiveTabSignal = signal(mockActiveTabValue);

          await TestBed.configureTestingModule({
               imports: [RequirementsInfoComponent, NoopAnimationsModule],
               providers: [
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    provideIcons({
                         heroExclamationTriangle,
                         heroClock,
                         heroChevronDown,
                         heroChevronUp,
                         heroInformationCircle,
                         heroMagnifyingGlass,
                    }),
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(RequirementsInfoComponent);
          component = fixture.componentInstance;

          // The input expects a function that returns a Signal
          // So we create a function that returns our mock signal
          (component as any).activeTab = () => mockActiveTabSignal;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input Handling', () => {
          it('should accept activeTab input signal', () => {
               expect(component.activeTab).toBeDefined();
               expect(typeof component.activeTab).toBe('function');

               // Call activeTab to get the signal, then call the signal to get the value
               const result = component.activeTab();
               expect(result).toBeDefined();
               expect(typeof result).toBe('function');
               expect(result()).toBe('setPermissionedDomain');
          });

          it('should react to activeTab signal changes', () => {
               // Initial value
               let currentTab = component.activeTab()();
               expect(currentTab).toBe('setPermissionedDomain');

               // Update the signal value
               mockActiveTabSignal = signal('deletePermissionedDomain');
               (component as any).activeTab = () => mockActiveTabSignal;
               fixture.detectChanges();

               currentTab = component.activeTab()();
               expect(currentTab).toBe('deletePermissionedDomain');
          });
     });

     describe('Collapsible Behavior', () => {
          it('should initialize with isExpanded as false', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should toggle isExpanded when header button is clicked', () => {
               const headerButton = fixture.debugElement.query(By.css('button'));
               expect(headerButton).toBeTruthy();

               // Initially collapsed
               expect(component.isExpanded()).toBeFalse();

               // Click to expand
               headerButton.triggerEventHandler('click', null);
               fixture.detectChanges();
               expect(component.isExpanded()).toBeTrue();

               // Click to collapse
               headerButton.triggerEventHandler('click', null);
               fixture.detectChanges();
               expect(component.isExpanded()).toBeFalse();
          });

          // it('should show expand button with correct icon when collapsed', () => {
          //      component.isExpanded.set(false);
          //      fixture.detectChanges();

          //      const chevronIcon = fixture.debugElement.query(By.css('lucide-icon[name="chevron-up"]'));
          //      expect(chevronIcon).toBeTruthy();
          // });

          // it('should show collapse button with correct icon when expanded', () => {
          //      component.isExpanded.set(true);
          //      fixture.detectChanges();

          //      const chevronIcon = fixture.debugElement.query(By.css('lucide-icon[name="chevron-down"]'));
          //      expect(chevronIcon).toBeTruthy();
          // });

          it('should show/hide content based on isExpanded state', () => {
               // Initially collapsed - content should not be visible
               let content = fixture.debugElement.query(By.css('div[class*="space-y-6 overflow-hidden"]'));
               expect(content).toBeFalsy();

               // Expand
               component.isExpanded.set(true);
               fixture.detectChanges();

               // Content should be visible
               content = fixture.debugElement.query(By.css('div[class*="space-y-6 overflow-hidden"]'));
               expect(content).toBeTruthy();
          });
     });

     describe('setPermissionedDomain Tab', () => {
          beforeEach(() => {
               mockActiveTabValue = 'setPermissionedDomain';
               mockActiveTabSignal = signal(mockActiveTabValue);
               (component as any).activeTab = () => mockActiveTabSignal;
               component.isExpanded.set(false);
               fixture.detectChanges();
          });

          it('should display setPermissionedDomain content when active', () => {
               const headerText = fixture.debugElement.query(By.css('button .font-semibold')).nativeElement.textContent;
               const normalizedText = headerText.trim().replace(/\s+/g, ' ');
               expect(normalizedText).toContain('Set Permission Domain Info');
          });

          it('should show permissioned domains info section when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const infoSection = fixture.debugElement.query(By.css('h3.font-semibold'));
               expect(infoSection).toBeTruthy();
               expect(infoSection.nativeElement.textContent).toContain('Permissioned Domains');
          });

          it('should show requirements section when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const requirementsHeader = fixture.debugElement.query(By.css('h4.font-semibold'));
               expect(requirementsHeader).toBeTruthy();
               expect(requirementsHeader.nativeElement.textContent).toContain('Requirements by Action');
          });

          it('should display domain creation requirements correctly', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const domainBadge = fixture.debugElement.query(By.css('.bg-blue-100'));
               expect(domainBadge).toBeTruthy();
               expect(domainBadge.nativeElement.textContent).toContain('Create / Update Domain');

               const requirements = fixture.debugElement.queryAll(By.css('.flex.justify-between.items-center'));
               expect(requirements.length).toBeGreaterThan(0);

               const domainIdReq = requirements.find(req => req.nativeElement.textContent.includes('DomainID'));
               expect(domainIdReq).toBeDefined();
               expect(domainIdReq!.nativeElement.textContent).toContain('Required');
          });

          it('should show important notes with amendment requirement', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const notes = fixture.debugElement.query(By.css('.bg-amber-50'));
               expect(notes).toBeTruthy();
               expect(notes.nativeElement.textContent).toContain('PermissionedDomains amendment');
               expect(notes.nativeElement.textContent).toContain('owner reserve');
          });

          it('should display URI field as optional', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const uriRow = Array.from(fixture.debugElement.queryAll(By.css('.flex.justify-between.items-center'))).find(row => row.nativeElement.textContent.includes('URI'));

               expect(uriRow).toBeDefined();
               expect(uriRow!.nativeElement.textContent).toContain('Optional');
          });
     });

     describe('deletePermissionedDomain Tab', () => {
          beforeEach(() => {
               mockActiveTabValue = 'deletePermissionedDomain';
               mockActiveTabSignal = signal(mockActiveTabValue);
               (component as any).activeTab = () => mockActiveTabSignal;
               component.isExpanded.set(false);
               fixture.detectChanges();
          });

          // it('should display deletePermissionedDomain content when active', () => {
          //      const headerText = fixture.debugElement.query(By.css('button .font-semibold')).nativeElement.textContent;
          //      const normalizedText = headerText.trim().replace(/\s+/g, ' ');
          //      expect(normalizedText).toContain('Delete Permission Domain Info');
          // });

          it('should show delete domain info section when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const infoSection = fixture.debugElement.query(By.css('h3.font-semibold'));
               expect(infoSection).toBeTruthy();
               expect(infoSection.nativeElement.textContent).toContain('Delete Permissioned Domain');
          });

          it('should display delete domain requirements', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const deleteBadge = fixture.debugElement.query(By.css('.bg-red-100'));
               expect(deleteBadge).toBeTruthy();
               expect(deleteBadge.nativeElement.textContent).toContain('Delete Domain');

               const requirements = fixture.debugElement.queryAll(By.css('.flex.justify-between.items-center'));

               const domainIdReq = requirements.find(req => req.nativeElement.textContent.includes('DomainID'));
               expect(domainIdReq).toBeDefined();
               expect(domainIdReq!.nativeElement.textContent).toContain('Required');

               const authReq = requirements.find(req => req.nativeElement.textContent.includes('Authorization'));
               expect(authReq).toBeDefined();
               expect(authReq!.nativeElement.textContent).toContain('Must be domain owner');
          });

          it('should show important notes about deletion', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const notes = fixture.debugElement.query(By.css('.bg-amber-50'));
               expect(notes).toBeTruthy();
               expect(notes.nativeElement.textContent).toContain('Only the domain owner can delete it');
               expect(notes.nativeElement.textContent).toContain('owner reserve');
          });

          it('should show operational risks section', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const risksSection = fixture.debugElement.query(By.css('.text-red-700.mt-6'));
               expect(risksSection).toBeTruthy();
               expect(risksSection.nativeElement.textContent).toContain('Operational Risks');

               const riskItems = fixture.debugElement.queryAll(By.css('.text-red-700.space-y-2 li'));
               expect(riskItems.length).toBeGreaterThan(0);
               expect(riskItems[0].nativeElement.textContent).toContain('revoke access');
          });
     });

     describe('UI Elements and Styling', () => {
          beforeEach(() => {
               component.isExpanded.set(true);
               fixture.detectChanges();
          });

          it('should display hero icon in header', () => {
               const heroIcon = fixture.debugElement.query(By.css('ng-icon[name="heroInformationCircle"]'));
               expect(heroIcon).toBeTruthy();
          });

          it('should have proper CSS classes for styling', () => {
               const mainContainer = fixture.debugElement.query(By.css('.space-y-6.p-3'));
               expect(mainContainer).toBeTruthy();

               const headerButton = fixture.debugElement.query(By.css('button.bg-white'));
               expect(headerButton).toBeTruthy();
               expect(headerButton.classes['rounded-2xl']).toBeTrue();
               expect(headerButton.classes['hover:bg-gray-50']).toBeTrue();
          });

          it('should have responsive design classes', () => {
               const expandButton = fixture.debugElement.query(By.css('.btn-ghost'));
               expect(expandButton).toBeTruthy();
               const spanElement = expandButton.query(By.css('.hidden.sm\\:inline'));
               expect(spanElement).toBeTruthy();
          });
     });

     describe('User Interactions', () => {
          it('should handle rapid expand/collapse clicks', () => {
               const headerButton = fixture.debugElement.query(By.css('button'));
               expect(headerButton).toBeTruthy();

               // Rapid toggles
               for (let i = 0; i < 5; i++) {
                    headerButton.triggerEventHandler('click', null);
                    fixture.detectChanges();
               }

               // After odd number of toggles (5), should be expanded
               expect(component.isExpanded()).toBeTrue();
          });

          it('should not throw error when expanding while content is already expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const headerButton = fixture.debugElement.query(By.css('button'));

               expect(() => {
                    headerButton.triggerEventHandler('click', null);
                    fixture.detectChanges();
               }).not.toThrow();
          });

          it('should maintain content visibility state after tab switch', () => {
               // Expand content
               component.isExpanded.set(true);
               fixture.detectChanges();

               // Switch tab
               mockActiveTabValue = 'deletePermissionedDomain';
               mockActiveTabSignal = signal(mockActiveTabValue);
               (component as any).activeTab = () => mockActiveTabSignal;
               fixture.detectChanges();

               // Content should still be expanded
               const content = fixture.debugElement.query(By.css('div[class*="space-y-6 overflow-hidden"]'));
               expect(content).toBeTruthy();
          });
     });

     describe('Accessibility', () => {
          it('should have title attributes on expand/collapse buttons', () => {
               const expandButton = fixture.debugElement.query(By.css('.btn-ghost'));
               expect(expandButton.attributes['title']).toBeDefined();
          });

          it('should update button title based on expanded state', () => {
               const expandButton = fixture.debugElement.query(By.css('.btn-ghost'));

               expect(expandButton.attributes['title']).toContain('Expand Panel');

               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(expandButton.attributes['title']).toContain('Collapse Panel');
          });

          it('should have proper heading hierarchy', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const h3 = fixture.debugElement.query(By.css('h3.font-semibold'));
               const h4 = fixture.debugElement.query(By.css('h4.font-semibold'));

               expect(h3).toBeTruthy();
               expect(h4).toBeTruthy();
          });
     });

     describe('Animation Integration', () => {
          it('should have expandCollapse animation in component metadata', () => {
               const componentInstance = fixture.componentInstance;
               expect(componentInstance).toBeTruthy();

               // Verify animation is applied by checking the element with animation trigger
               component.isExpanded.set(true);
               fixture.detectChanges();

               const animatedDiv = fixture.debugElement.query(By.css('[class*="space-y-6 overflow-hidden"]'));
               expect(animatedDiv).toBeTruthy();
          });
     });

     describe('Edge Cases', () => {
          it('should handle component without valid tab value', () => {
               // Test with undefined
               mockActiveTabValue = undefined as any;
               mockActiveTabSignal = signal(mockActiveTabValue as any);
               (component as any).activeTab = () => mockActiveTabSignal;
               fixture.detectChanges();

               // Component should still render the header button
               expect(fixture.debugElement.query(By.css('button'))).toBeTruthy();
          });

          it('should handle empty content when not expanded', () => {
               component.isExpanded.set(false);
               fixture.detectChanges();

               const contentDivs = fixture.debugElement.queryAll(By.css('div[class*="space-y-6 overflow-hidden"]'));
               expect(contentDivs.length).toBe(0);
          });

          it('should render both tab contents correctly when switching quickly', () => {
               const tabs = ['setPermissionedDomain', 'deletePermissionedDomain', 'setPermissionedDomain'];

               tabs.forEach(tab => {
                    mockActiveTabValue = tab as any;
                    mockActiveTabSignal = signal(mockActiveTabValue);
                    (component as any).activeTab = () => mockActiveTabSignal;
                    fixture.detectChanges();

                    component.isExpanded.set(true);
                    fixture.detectChanges();

                    const content = fixture.debugElement.query(By.css('div[class*="space-y-6 overflow-hidden"]'));
                    expect(content).toBeTruthy();
               });
          });

          it('should handle isExpanded toggles without content', () => {
               // Toggle without any content initially
               component.isExpanded.set(true);
               fixture.detectChanges();
               expect(component.isExpanded()).toBeTrue();

               component.isExpanded.set(false);
               fixture.detectChanges();
               expect(component.isExpanded()).toBeFalse();
          });
     });
});
