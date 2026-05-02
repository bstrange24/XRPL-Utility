import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletGeneratorRequirementsInfoComponent } from './wallet-generator-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('WalletGeneratorRequirementsInfoComponent', () => {
     let component: WalletGeneratorRequirementsInfoComponent;
     let fixture: ComponentFixture<WalletGeneratorRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [WalletGeneratorRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(WalletGeneratorRequirementsInfoComponent);
          component = fixture.componentInstance;

          // required input signal
          fixture.componentRef.setInput('activeTab', 'generate');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // ---------------------------------
     // Initial State
     // ---------------------------------
     // it('should start collapsed', () => {
     //      expect(component.isExpanded()).toBeFalse();

     //      const text = fixture.nativeElement.textContent;
     //      expect(text).not.toContain('XRPL Wallet Configurator');
     // });

     // ---------------------------------
     // Toggle behavior
     // ---------------------------------
     it('should expand on click', () => {
          const header = fixture.nativeElement.querySelector('button');
          header.click();

          fixture.detectChanges();

          expect(component.isExpanded()).toBeTrue();
     });

     it('should collapse after second click', () => {
          const header = fixture.nativeElement.querySelector('button');

          header.click();
          fixture.detectChanges();

          header.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeFalse();
     });

     // ---------------------------------
     // Main sections render
     // ---------------------------------
     it('should render main description when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('XRPL Wallet Configurator');
          expect(text).toContain('Generate a fresh XRPL wallet');
     });

     it('should render wallet creation section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Wallet Creation & Derivation');
          expect(text).toContain('Generate New Wallet');
          expect(text).toContain('Derive Existing Wallet');
     });

     // ---------------------------------
     // Generate Wallet content
     // ---------------------------------
     it('should render generation algorithm details', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('ed25519 or secp256k1');
          expect(text).toContain('Random seed generation');
     });

     // ---------------------------------
     // Derivation content
     // ---------------------------------
     it('should render derivation methods', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Family Seed');
          expect(text).toContain('Mnemonic');
          expect(text).toContain('Secret Numbers');
     });

     // ---------------------------------
     // Security section
     // ---------------------------------
     it('should render important notes section', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Important Notes');
          expect(text).toContain('client-side only');
          expect(text).toContain('sEd');
          expect(text).toContain('s...');
     });

     // ---------------------------------
     // Critical warnings
     // ---------------------------------
     it('should render critical security warning', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Critical Security');
          expect(text).toContain('Never share');
          expect(text).toContain('Lost secrets');
     });

     it('should render irreversibility warnings', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('no undo');
          expect(text).toContain('permanent loss');
     });

     // ---------------------------------
     // UI state text
     // ---------------------------------
     it('should show Expand when collapsed', () => {
          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Expand');
     });

     it('should show Collapse when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Collapse');
     });

     // ---------------------------------
     // Stability
     // ---------------------------------
     it('should remain stable under repeated toggles', () => {
          for (let i = 0; i < 20; i++) {
               component.isExpanded.set(!component.isExpanded());
          }

          fixture.detectChanges();

          expect(component).toBeTruthy();
     });
});
