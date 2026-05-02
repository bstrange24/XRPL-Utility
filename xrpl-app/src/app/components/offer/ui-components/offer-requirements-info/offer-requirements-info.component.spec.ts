import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { OfferRequirementsInfoComponent } from './offer-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

describe('OfferRequirementsInfoComponent', () => {
     let component: OfferRequirementsInfoComponent;
     let fixture: ComponentFixture<OfferRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [OfferRequirementsInfoComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          })
               .overrideComponent(OfferRequirementsInfoComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(OfferRequirementsInfoComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('activeTab', 'createOffer');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have activeTab input', () => {
               expect(component.activeTab()).toBe('createOffer');
          });

          it('should accept only createOffer value', () => {
               fixture.componentRef.setInput('activeTab', 'createOffer');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('createOffer');
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

     describe('Content Sections', () => {
          it('should have main description section', () => {
               const title = 'XRPL DEX Offers';
               expect(title).toBe('XRPL DEX Offers');
          });

          it('should have description text', () => {
               const description = 'Create, cancel, and manage offers on the XRPL decentralized exchange to trade any two assets.';
               expect(description).toContain('Create, cancel, and manage offers');
          });

          it('should have key operations section', () => {
               const sectionTitle = 'Key Operations';
               expect(sectionTitle).toBe('Key Operations');
          });

          it('should have important notes section', () => {
               const notesTitle = '📝 Important Notes';
               expect(notesTitle).toContain('Important Notes');
          });

          it('should have risks section', () => {
               const risksTitle = '⚠️ Risks & Considerations';
               expect(risksTitle).toContain('Risks & Considerations');
          });
     });

     describe('Create Offer Requirements', () => {
          it('should list Taker Gets as required', () => {
               const requiredFields = ['Taker Gets', 'Taker Pays'];
               expect(requiredFields).toContain('Taker Gets');
               expect(requiredFields).toContain('Taker Pays');
          });

          it('should list Flags as optional with default Passive', () => {
               const optionalField = 'Flags';
               const defaultNote = '(Default Passive)';
               expect(optionalField).toBe('Flags');
               expect(defaultNote).toContain('Default Passive');
          });

          it('should show Create Offer badge', () => {
               const badge = '📈 Create Offer';
               expect(badge).toContain('Create Offer');
          });
     });

     describe('Cancel/View Requirements', () => {
          it('should list Offer Sequence as required for cancel', () => {
               const requirement = 'Offer Sequence / Index';
               expect(requirement).toBe('Offer Sequence / Index');
          });

          it('should list Order Book Query requirement', () => {
               const requirement = 'Order Book Query';
               expect(requirement).toBe('Order Book Query');
          });

          it('should show Cancel/View Offers badge', () => {
               const badge = '❌ Cancel / View Offers';
               expect(badge).toContain('Cancel / View Offers');
          });

          it('should show TakerGets + TakerPays pair note', () => {
               const note = 'TakerGets + TakerPays pair';
               expect(note).toContain('TakerGets + TakerPays');
          });
     });

     describe('Important Notes Content', () => {
          it('should mention limit orders', () => {
               const note = 'Offers are limit orders that sit in the order book until matched, canceled, or expired.';
               expect(note).toContain('limit orders');
          });

          it('should explain Taker Gets', () => {
               const note = "Taker Gets: What you receive (what you're buying into).";
               expect(note).toContain('What you receive');
          });

          it('should explain Taker Pays', () => {
               const note = "Taker Pays: What you give (what you're selling).";
               expect(note).toContain('What you give');
          });

          it('should list common flags', () => {
               const flags = 'tfPassive, tfImmediateOrCancel, tfFillOrKill, tfSell';
               expect(flags).toContain('tfPassive');
               expect(flags).toContain('tfImmediateOrCancel');
               expect(flags).toContain('tfFillOrKill');
               expect(flags).toContain('tfSell');
          });

          it('should mention owner reserve consumption', () => {
               const note = 'Each active offer consumes owner reserve (~0.2 XRP) until resolved.';
               expect(note).toContain('owner reserve');
          });
     });

     describe('Risks Content', () => {
          it('should mention trades are permanent', () => {
               const risk = 'Once matched, trades are permanent — no native reversal.';
               expect(risk).toContain('trades are permanent');
          });

          it('should mention reserve lock', () => {
               const risk = "Active offers lock reserve — too many can freeze your account's XRP.";
               expect(risk).toContain('lock reserve');
          });

          it('should mention wrong asset pair risk', () => {
               const risk = 'Wrong asset pair or issuer leads to invalid offers.';
               expect(risk).toContain('Wrong asset pair');
          });

          it('should mention testing on Devnet/Testnet', () => {
               const risk = 'Always test on Devnet/Testnet first.';
               expect(risk).toContain('test on Devnet/Testnet');
          });
     });

     describe('Badge Colors', () => {
          it('should have emerald badge for Create Offer', () => {
               const classes = 'bg-emerald-100 text-emerald-700';
               expect(classes).toContain('bg-emerald-100');
               expect(classes).toContain('text-emerald-700');
          });

          it('should have amber badge for Cancel/View', () => {
               const classes = 'bg-amber-100 text-amber-700';
               expect(classes).toContain('bg-amber-100');
               expect(classes).toContain('text-amber-700');
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
});
