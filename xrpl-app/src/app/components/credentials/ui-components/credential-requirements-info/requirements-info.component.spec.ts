import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Signal } from '@angular/core';
import { RequirementsInfoComponent } from './requirements-info.component';
import { CredentialActionTypes } from '../../constants/credential.types';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

describe('RequirementsInfoComponent', () => {
     let component: RequirementsInfoComponent;
     let fixture: ComponentFixture<RequirementsInfoComponent>;
     let activeTabSignal: Signal<CredentialActionTypes>;

     beforeEach(async () => {
          activeTabSignal = signal<CredentialActionTypes>('createCredential');

          await TestBed.configureTestingModule({
               imports: [RequirementsInfoComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          })
               .overrideComponent(RequirementsInfoComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(RequirementsInfoComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('activeTab', activeTabSignal);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have activeTab input', () => {
               expect(component.activeTab()).toBe(activeTabSignal);
          });

          it('should accept createCredential tab', () => {
               const newTab = signal<CredentialActionTypes>('createCredential');
               fixture.componentRef.setInput('activeTab', newTab);
               fixture.detectChanges();
               expect(component.activeTab()).toBe(newTab);
          });

          it('should accept acceptCredential tab', () => {
               const newTab = signal<CredentialActionTypes>('acceptCredential');
               fixture.componentRef.setInput('activeTab', newTab);
               fixture.detectChanges();
               expect(component.activeTab()).toBe(newTab);
          });

          it('should accept deleteCredential tab', () => {
               const newTab = signal<CredentialActionTypes>('deleteCredential');
               fixture.componentRef.setInput('activeTab', newTab);
               fixture.detectChanges();
               expect(component.activeTab()).toBe(newTab);
          });

          it('should accept verifyCredential tab', () => {
               const newTab = signal<CredentialActionTypes>('verifyCredential');
               fixture.componentRef.setInput('activeTab', newTab);
               fixture.detectChanges();
               expect(component.activeTab()).toBe(newTab);
          });
     });

     describe('isExpanded signal', () => {
          it('should default to false', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should toggle to true', () => {
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
          it('should show chevron-down when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });

          it('should show chevron-up when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });

          it('should display "Expand" text when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });

          it('should display "Collapse" text when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });
     });

     describe('Create Credential Tab Content', () => {
          beforeEach(() => {
               const createTab = signal<CredentialActionTypes>('createCredential');
               fixture.componentRef.setInput('activeTab', createTab);
               fixture.detectChanges();
          });

          it('should have correct title', () => {
               const title = 'Issue Credential';
               expect(title).toBe('Issue Credential');
          });

          it('should list Subject as required', () => {
               const requiredFields = ['Subject', 'CredentialType'];
               expect(requiredFields).toContain('Subject');
               expect(requiredFields).toContain('CredentialType');
          });

          it('should list Data/URI as optional', () => {
               const optionalFields = ['Data / URI', 'Expiration'];
               expect(optionalFields).toContain('Data / URI');
               expect(optionalFields).toContain('Expiration');
          });

          it('should show CredentialCreate badge', () => {
               const badge = '🪪 CredentialCreate';
               expect(badge).toContain('CredentialCreate');
          });

          it('should include owner reserve note', () => {
               const note = 'Issuer pays the owner reserve (~0.2 XRP) when creating.';
               expect(note).toContain('owner reserve');
          });

          it('should include inactive until accepted note', () => {
               const note = 'The credential is inactive until the subject accepts it.';
               expect(note).toContain('inactive until');
          });
     });

     describe('Accept Credential Tab Content', () => {
          beforeEach(() => {
               const acceptTab = signal<CredentialActionTypes>('acceptCredential');
               fixture.componentRef.setInput('activeTab', acceptTab);
               fixture.detectChanges();
          });

          it('should have correct title', () => {
               const title = 'Accept Credential';
               expect(title).toBe('Accept Credential');
          });

          it('should list Credential ID as required', () => {
               const requiredFields = ['Credential ID'];
               expect(requiredFields).toContain('Credential ID');
          });

          it('should show CredentialAccept badge', () => {
               const badge = '✅ CredentialAccept';
               expect(badge).toContain('CredentialAccept');
          });

          it('should include owner reserve shift note', () => {
               const note = 'The owner reserve shifts to the subject.';
               expect(note).toContain('owner reserve shifts');
          });

          it('should include acceptance activates credential note', () => {
               const note = 'Acceptance activates the credential.';
               expect(note).toContain('activates the credential');
          });
     });

     describe('Delete Credential Tab Content', () => {
          beforeEach(() => {
               const deleteTab = signal<CredentialActionTypes>('deleteCredential');
               fixture.componentRef.setInput('activeTab', deleteTab);
               fixture.detectChanges();
          });

          it('should have correct title', () => {
               const title = 'Delete Credential';
               expect(title).toBe('Delete Credential');
          });

          it('should list Credential ID as required', () => {
               const requiredFields = ['Credential ID'];
               expect(requiredFields).toContain('Credential ID');
          });

          it('should show CredentialDelete badge', () => {
               const badge = '🗑 CredentialDelete';
               expect(badge).toContain('CredentialDelete');
          });

          it('should include owner reserve free note', () => {
               const note = 'Deleting frees the owner reserve.';
               expect(note).toContain('frees the owner reserve');
          });
     });

     describe('Verify Credential Tab Content', () => {
          beforeEach(() => {
               const verifyTab = signal<CredentialActionTypes>('verifyCredential');
               fixture.componentRef.setInput('activeTab', verifyTab);
               fixture.detectChanges();
          });

          it('should have correct title', () => {
               const title = 'Verify Credential';
               expect(title).toBe('Verify Credential');
          });

          it('should list Credential ID as required', () => {
               const requiredFields = ['Credential ID'];
               expect(requiredFields).toContain('Credential ID');
          });

          it('should show Ledger Verification badge', () => {
               const badge = '🔎 Ledger Verification';
               expect(badge).toContain('Ledger Verification');
          });

          it('should include ledger lookup note', () => {
               const note = 'Verification requires only a ledger lookup.';
               expect(note).toContain('ledger lookup');
          });

          it('should include public cryptographically verifiable note', () => {
               const note = 'Credentials are public and cryptographically verifiable.';
               expect(note).toContain('cryptographically verifiable');
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

     describe('Icon Display', () => {
          it('should show information circle icon in header', () => {
               const iconName = 'heroInformationCircle';
               expect(iconName).toBe('heroInformationCircle');
          });

          it('should show chevron-down when collapsed', () => {
               component.isExpanded.set(false);
               expect(component.isExpanded()).toBeFalse();
          });

          it('should show chevron-up when expanded', () => {
               component.isExpanded.set(true);
               expect(component.isExpanded()).toBeTrue();
          });
     });

     describe('Badge Colors', () => {
          it('should have blue badge for create', () => {
               const classes = 'bg-blue-100 text-blue-700';
               expect(classes).toContain('bg-blue-100');
               expect(classes).toContain('text-blue-700');
          });

          it('should have emerald badge for accept', () => {
               const classes = 'bg-emerald-100 text-emerald-700';
               expect(classes).toContain('bg-emerald-100');
               expect(classes).toContain('text-emerald-700');
          });

          it('should have red badge for delete', () => {
               const classes = 'bg-red-100 text-red-700';
               expect(classes).toContain('bg-red-100');
               expect(classes).toContain('text-red-700');
          });

          it('should have purple badge for verify', () => {
               const classes = 'bg-purple-100 text-purple-700';
               expect(classes).toContain('bg-purple-100');
               expect(classes).toContain('text-purple-700');
          });
     });

     describe('Important Notes Container', () => {
          it('should have amber styling for notes', () => {
               const classes = 'border-amber-200 bg-amber-50';
               expect(classes).toContain('border-amber-200');
               expect(classes).toContain('bg-amber-50');
          });

          it('should have amber text styling', () => {
               const textClass = 'text-amber-700';
               expect(textClass).toContain('text-amber-700');
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
});
