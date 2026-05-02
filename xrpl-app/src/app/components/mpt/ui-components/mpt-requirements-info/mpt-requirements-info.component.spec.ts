import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MptRequirementsInfoComponent } from './mpt-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('MptRequirementsInfoComponent', () => {
     let component: MptRequirementsInfoComponent;
     let fixture: ComponentFixture<MptRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [MptRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(MptRequirementsInfoComponent);
          component = fixture.componentInstance;

          // required input signal
          fixture.componentRef.setInput('activeTab', 'createMpt');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // ---------------------------------
     // Default State
     // ---------------------------------
     it('should be collapsed by default', () => {
          expect(component.isExpanded()).toBeFalse();

          const content = fixture.nativeElement.textContent;
          expect(content).not.toContain('XRPL Multi-Purpose Tokens');
     });

     // ---------------------------------
     // Toggle Behavior
     // ---------------------------------
     it('should expand when header is clicked', () => {
          const headerBtn = fixture.nativeElement.querySelector('button');

          headerBtn.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeTrue();
     });

     it('should collapse when clicked twice', () => {
          const headerBtn = fixture.nativeElement.querySelector('button');

          headerBtn.click();
          fixture.detectChanges();

          headerBtn.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeFalse();
     });

     // ---------------------------------
     // Conditional Rendering
     // ---------------------------------
     it('should render main description when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('XRPL Multi-Purpose Tokens');
          expect(text).toContain('Authorization Rules');
     });

     it('should render authorization rules section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Holder Self-Authorization');
          expect(text).toContain('Issuer Authorization');
     });

     it('should render important notes section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Important Notes');
          expect(text).toContain('Metadata is immutable');
     });

     it('should render authorization flow section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('MPT Authorization Flow');
          expect(text).toContain('MPTokenAuthorize');
     });

     it('should render common gotchas section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Common Gotchas');
          expect(text).toContain('self-authorized');
     });

     // ---------------------------------
     // UI State Text
     // ---------------------------------
     it('should show Expand text when collapsed', () => {
          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Expand');
     });

     it('should show Collapse text when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Collapse');
     });

     // ---------------------------------
     // Stability
     // ---------------------------------
     it('should remain stable after repeated toggles', () => {
          for (let i = 0; i < 10; i++) {
               component.isExpanded.set(!component.isExpanded());
          }

          fixture.detectChanges();

          expect(component).toBeTruthy();
     });
});
