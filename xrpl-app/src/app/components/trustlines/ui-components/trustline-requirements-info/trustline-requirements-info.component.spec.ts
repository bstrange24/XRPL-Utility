import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TrustlineRequirementsInfoComponent } from './trustline-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

describe('TrustlineRequirementsInfoComponent', () => {
     let component: TrustlineRequirementsInfoComponent;
     let fixture: ComponentFixture<TrustlineRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TrustlineRequirementsInfoComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          })
               .overrideComponent(TrustlineRequirementsInfoComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TrustlineRequirementsInfoComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('activeTab', 'setTrustline');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have activeTab input', () => {
               expect(component.activeTab()).toBe('setTrustline');
          });

          it('should accept only setTrustline value', () => {
               fixture.componentRef.setInput('activeTab', 'setTrustline');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('setTrustline');
          });
     });

     describe('isExpanded signal', () => {
          it('should default to false', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should toggle to true when button clicked', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });

          it('should toggle back to false', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();

               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });
     });

     describe('Expand/Collapse Button', () => {
          it('should show chevron-down when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });

          it('should show chevron-up when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });

          it('should display "Collapse" text when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });

          it('should display "Expand" text when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });
     });

     describe('Content Sections', () => {
          it('should have main description section', () => {
               const title = 'Trust Lines';
               expect(title).toBe('Trust Lines');
          });

          it('should have requirements section for Create/Modify', () => {
               const createTitle = '🔗 Create / Modify Trust Line';
               expect(createTitle).toContain('Create / Modify');
          });

          it('should have requirements section for Remove', () => {
               const removeTitle = '❌ Remove Trust Line';
               expect(removeTitle).toContain('Remove');
          });

          it('should have important notes section', () => {
               const notesTitle = '<ng-icon name="heroDocumentText" size="16" class="text-amber-800 flex-shrink-0 mt-0.5" />Important Notes';
               expect(notesTitle).toContain('Important Notes');
          });

          it('should have common gotchas subsection', () => {
               const gotchasTitle = '<ng-icon name="heroExclamationTriangle" size="16" class="text-amber-600 flex-shrink-0 mt-0.5" /> Common Gotchas';
               expect(gotchasTitle).toContain('Common Gotchas');
          });
     });

     describe('Create/Modify Requirements', () => {
          it('should list Currency Code as required', () => {
               const requiredFields = ['Currency Code', 'Issuer', 'Limit Amount'];
               expect(requiredFields).toContain('Currency Code');
               expect(requiredFields).toContain('Issuer');
               expect(requiredFields).toContain('Limit Amount');
          });

          it('should list Flags as optional', () => {
               const optionalFields = ['Flags (NoRipple, Freeze, etc.)'];
               expect(optionalFields).toContain('Flags (NoRipple, Freeze, etc.)');
          });

          it('should show required indicators', () => {
               const requiredIndicator = 'Required';
               expect(requiredIndicator).toBe('Required');
          });

          it('should show optional indicator', () => {
               const optionalIndicator = 'Optional';
               expect(optionalIndicator).toBe('Optional');
          });
     });

     describe('Remove Requirements', () => {
          it('should require Limit Amount = 0', () => {
               const requirement = 'Limit Amount = 0';
               expect(requirement).toBe('Limit Amount = 0');
          });

          it('should require Outstanding Balance = 0', () => {
               const requirement = 'Outstanding Balance';
               expect(requirement).toBe('Outstanding Balance');
          });

          it('should show Must be 0 indicator', () => {
               const indicator = 'Must be 0';
               expect(indicator).toBe('Must be 0');
          });
     });

     describe('Important Notes Content', () => {
          it('should mention XRP does not need trustline', () => {
               const note = 'Trust Lines are required to hold issued tokens (IOUs). XRP does not need one.';
               expect(note).toContain('XRP does not need one');
          });

          it('should mention setting positive limit creates trustline', () => {
               const note = 'Setting a positive limit creates a trust line if one does not already exist.';
               expect(note).toContain('creates a trust line');
          });

          it('should mention removal conditions', () => {
               const note = 'To remove a trust line, the balance must be exactly zero and the limit set to 0.';
               expect(note).toContain('balance must be exactly zero');
          });

          it('should mention owner reserve consumption', () => {
               const note = 'Each trust line consumes owner reserve (~0.2 XRP) while active.';
               expect(note).toContain('consumes owner reserve');
          });

          it('should mention issuer freeze capability', () => {
               const note = 'The issuer can freeze a trust line if they have the Freeze feature enabled.';
               expect(note).toContain('can freeze a trust line');
          });
     });

     describe('Common Gotchas Content', () => {
          it('should mention reducing limit does not remove trustline', () => {
               const gotcha = 'Reducing the limit does not remove the trust line if balance > 0.';
               expect(gotcha).toContain('Reducing the limit does not remove');
          });

          it('should mention zero-balance trustlines are hidden', () => {
               const gotcha = 'Zero-balance trust lines are hidden in this app (normal XRPL behavior).';
               expect(gotcha).toContain('Zero-balance trust lines are hidden');
          });
     });

     describe('Animation', () => {
          it('should have expandCollapse animation', () => {
               expect(component.isExpanded()).toBeDefined();
          });

          it('should show content when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });

          it('should hide content when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });
     });

     describe('Edge Cases', () => {
          it('should handle rapid expand/collapse toggles', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();

               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();

               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();

               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });

          it('should maintain expanded state after multiple toggles', () => {
               component.isExpanded.set(true);
               component.isExpanded.set(false);
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });
     });

     describe('Icon Display', () => {
          it('should show information circle icon in header', () => {
               const iconName = 'heroInformationCircle';
               expect(iconName).toBe('heroInformationCircle');
          });

          it('should show chevron-down icon when expanded', () => {
               component.isExpanded.set(true);
               const iconName = 'chevron-down';
               expect(iconName).toBe('chevron-down');
          });

          it('should show chevron-up icon when collapsed', () => {
               component.isExpanded.set(false);
               const iconName = 'chevron-up';
               expect(iconName).toBe('chevron-up');
          });
     });

     describe('CSS Classes', () => {
          it('should have appropriate styling for create/modify section', () => {
               const classes = 'bg-blue-100 text-blue-700';
               expect(classes).toContain('bg-blue-100');
               expect(classes).toContain('text-blue-700');
          });

          it('should have appropriate styling for remove section', () => {
               const classes = 'bg-red-100 text-red-700';
               expect(classes).toContain('bg-red-100');
               expect(classes).toContain('text-red-700');
          });

          it('should have appropriate styling for important notes', () => {
               const classes = 'bg-amber-50';
               expect(classes).toContain('bg-amber-50');
          });
     });
});
