import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDeleteRequirementsInfoComponent } from './account-delete-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { By } from '@angular/platform-browser';

describe('AccountDeleteRequirementsInfoComponent', () => {
     let component: AccountDeleteRequirementsInfoComponent;
     let fixture: ComponentFixture<AccountDeleteRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(AccountDeleteRequirementsInfoComponent);
          component = fixture.componentInstance;

          // ✅ REQUIRED input signal
          fixture.componentRef.setInput('activeTab', 'deleteAccount');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // -------------------------
     // Initial State
     // -------------------------
     it('should be collapsed by default', () => {
          expect(component.isExpanded()).toBeFalse();

          const content = fixture.debugElement.query(By.css('h3'));
          expect(content).toBeNull();
     });

     // -------------------------
     // Toggle Expand
     // -------------------------
     it('should expand when header is clicked', () => {
          const headerButton = fixture.debugElement.query(By.css('button'));
          headerButton.triggerEventHandler('click');

          fixture.detectChanges();

          expect(component.isExpanded()).toBeTrue();
     });

     it('should collapse when clicked again', () => {
          const headerButton = fixture.debugElement.query(By.css('button'));

          headerButton.triggerEventHandler('click');
          fixture.detectChanges();

          headerButton.triggerEventHandler('click');
          fixture.detectChanges();

          expect(component.isExpanded()).toBeFalse();
     });

     // -------------------------
     // DOM Rendering
     // -------------------------
     it('should render content when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const title = fixture.nativeElement.textContent;

          expect(title).toContain('AccountDelete');
          expect(title).toContain('Requirements');
          expect(title).toContain('Important Notes');
     });

     it('should render cleanup checklist', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Recommended Cleanup Before Deletion');
          expect(text).toContain('Remove all trust lines');
          expect(text).toContain('Cancel all open DEX offers');
     });

     it('should render irreversible warning section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Permanent & Irreversible Action');
          expect(text).toContain('can never be recreated');
     });

     // -------------------------
     // Button Label State
     // -------------------------
     it('should show "Expand" when collapsed', () => {
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Expand');
     });

     it('should show "Collapse" when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Collapse');
     });

     // -------------------------
     // Edge Case
     // -------------------------
     it('should not break if toggled rapidly', () => {
          for (let i = 0; i < 5; i++) {
               component.isExpanded.set(!component.isExpanded());
          }

          fixture.detectChanges();

          expect(component).toBeTruthy();
     });
});
