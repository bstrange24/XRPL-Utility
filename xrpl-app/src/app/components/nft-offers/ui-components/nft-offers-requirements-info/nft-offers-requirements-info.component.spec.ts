import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NftOffersRequirementsInfoComponent } from './nft-offers-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('NftOffersRequirementsInfoComponent', () => {
     let component: NftOffersRequirementsInfoComponent;
     let fixture: ComponentFixture<NftOffersRequirementsInfoComponent>;
     let el: HTMLElement;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [NftOffersRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(NftOffersRequirementsInfoComponent);
          component = fixture.componentInstance;

          // required input
          fixture.componentRef.setInput('activeTab', 'buyNft');

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
               expect(el.textContent).not.toContain('How NFT Offers Work');
               expect(el.textContent).not.toContain('Important Notes');
          });

          it('should show "Expand" label when collapsed', () => {
               expect(el.textContent).toContain('Expand');
          });
     });

     describe('toggle behavior', () => {
          it('should toggle isExpanded when header is clicked', () => {
               const button = el.querySelector('button') as HTMLButtonElement;

               button.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeTrue();

               button.click();
               fixture.detectChanges();

               expect(component.isExpanded()).toBeFalse();
          });

          it('should render content when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(el.textContent).toContain('How NFT Offers Work');
               expect(el.textContent).toContain('Important Notes');
               expect(el.textContent).toContain('NFT Offers (Buy / Sell / Cancel)');
          });

          it('should show "Collapse" label when expanded', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(el.textContent).toContain('Collapse');
          });
     });

     describe('content validation', () => {
          beforeEach(() => {
               component.isExpanded.set(true);
               fixture.detectChanges();
          });

          it('should display create offer section', () => {
               expect(el.textContent).toContain('Create Offer');
               expect(el.textContent).toContain('NFTokenID');
               expect(el.textContent).toContain('Amount');
               expect(el.textContent).toContain('Sell or Buy');
          });

          it('should display accept/cancel section', () => {
               expect(el.textContent).toContain('Accept / Cancel');
               expect(el.textContent).toContain('NFTokenOfferIndex');
               expect(el.textContent).toContain('BrokerFee');
          });

          it('should display important notes', () => {
               expect(el.textContent).toContain('Sell offer: You must own the NFT');
               expect(el.textContent).toContain('Buy offer: You place a bid');
          });

          it('should display risk warnings', () => {
               expect(el.textContent).toContain('Important Risks');
               expect(el.textContent).toContain('permanent');
               expect(el.textContent).toContain('Wrong NFTokenID');
          });
     });

     describe('icons rendering', () => {
          it('should render header icon', () => {
               const icon = el.querySelector('ng-icon');
               expect(icon).toBeTruthy();
          });

          it('should render lucide icon toggle', () => {
               const icon = el.querySelector('lucide-icon');
               expect(icon).toBeTruthy();
          });
     });

     describe('edge cases', () => {
          it('should remain stable when toggled multiple times rapidly', () => {
               for (let i = 0; i < 5; i++) {
                    component.isExpanded.set(!component.isExpanded());
               }

               fixture.detectChanges();

               expect(typeof component.isExpanded()).toBe('boolean');
          });

          it('should not throw if content is toggled before detectChanges', () => {
               component.isExpanded.set(true);
               expect(() => fixture.detectChanges()).not.toThrow();
          });
     });
});
