import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NftRequirementsInfoComponent } from './nft-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('NftRequirementsInfoComponent', () => {
     let component: NftRequirementsInfoComponent;
     let fixture: ComponentFixture<NftRequirementsInfoComponent>;
     let el: HTMLElement;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [NftRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(NftRequirementsInfoComponent);
          component = fixture.componentInstance;

          // REQUIRED input
          fixture.componentRef.setInput('activeTab', 'createNft');

          fixture.detectChanges();
          el = fixture.nativeElement as HTMLElement;
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------
     describe('initial state', () => {
          it('should start collapsed', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should not render content when collapsed', () => {
               expect(el.textContent).not.toContain('XRPL NFTs');
               expect(el.textContent).not.toContain('Mint NFT');
               expect(el.textContent).not.toContain('Burn / Modify');
          });

          it('should show Expand label', () => {
               expect(el.textContent).toContain('Expand');
          });
     });

     // -------------------------
     // TOGGLE BEHAVIOR
     // -------------------------
     describe('toggle behavior', () => {
          it('should expand when header is clicked', () => {
               const button = el.querySelector('button') as HTMLButtonElement;

               button.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeTrue();
          });

          it('should collapse on second click', () => {
               const button = el.querySelector('button') as HTMLButtonElement;

               button.click();
               button.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeFalse();
          });

          it('should show Collapse label when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(el.textContent).toContain('Collapse');
          });
     });

     // -------------------------
     // EXPANDED CONTENT
     // -------------------------
     describe('expanded content', () => {
          beforeEach(() => {
               component.isExpanded.set(true);
               fixture.detectChanges();
          });

          it('should render main description', () => {
               expect(el.textContent).toContain('XRPL NFTs (Non-Fungible Tokens)');
               expect(el.textContent).toContain('NFTokenMint');
          });

          it('should render mint section', () => {
               expect(el.textContent).toContain('Mint NFT');
               expect(el.textContent).toContain('URI');
               expect(el.textContent).toContain('Taxon');
               expect(el.textContent).toContain('TransferFee');
               expect(el.textContent).toContain('Flags');
          });

          it('should render burn/modify section', () => {
               expect(el.textContent).toContain('Burn / Modify');
               expect(el.textContent).toContain('NFTokenID');
               expect(el.textContent).toContain('Owner (for burn)');
          });

          it('should render important notes', () => {
               expect(el.textContent).toContain('NonFungibleTokensV1_1');
               expect(el.textContent).toContain('owner reserve');
               expect(el.textContent).toContain('hex-encoded');
          });

          it('should render irreversibility section', () => {
               expect(el.textContent).toContain('Irreversibility');
               expect(el.textContent).toContain('permanent');
               expect(el.textContent).toContain('tfMutable');
               expect(el.textContent).toContain('Burning is permanent');
          });
     });

     // -------------------------
     // ICONS
     // -------------------------
     describe('icons', () => {
          it('should render ng-icon', () => {
               expect(el.querySelector('ng-icon')).toBeTruthy();
          });

          it('should render lucide toggle icon', () => {
               expect(el.querySelector('lucide-icon')).toBeTruthy();
          });
     });

     // -------------------------
     // INPUT SIGNAL
     // -------------------------
     describe('input handling', () => {
          it('should accept activeTab input', () => {
               expect(component.activeTab()).toBe('createNft');
          });
     });

     // -------------------------
     // STABILITY
     // -------------------------
     describe('stability', () => {
          it('should handle rapid toggling', () => {
               for (let i = 0; i < 10; i++) {
                    component.isExpanded.set(!component.isExpanded());
               }

               fixture.detectChanges();

               expect(typeof component.isExpanded()).toBe('boolean');
          });

          it('should not throw when expanding', () => {
               component.isExpanded.set(true);

               expect(() => fixture.detectChanges()).not.toThrow();
          });
     });
});
