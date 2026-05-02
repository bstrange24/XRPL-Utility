import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentChannelRequirementsInfoComponent } from './payment-channel-requirements-info.component';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroInformationCircle } from '@ng-icons/heroicons/outline'; // ← Import the actual icon
import { icons, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('PaymentChannelRequirementsInfoComponent', () => {
     let component: PaymentChannelRequirementsInfoComponent;
     let fixture: ComponentFixture<PaymentChannelRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CommonModule, NgIcon, LucideAngularModule, PaymentChannelRequirementsInfoComponent],
               providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, provideIcons({ heroInformationCircle })],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelRequirementsInfoComponent);
          component = fixture.componentInstance;

          // Required InputSignal
          (component.activeTab as any) = signal<'createPaymentChannel'>('createPaymentChannel');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should have activeTab input', () => {
          expect(component.activeTab()).toBe('createPaymentChannel');
     });

     describe('Template Rendering', () => {
          it('should render header', () => {
               const header = fixture.debugElement.query(By.css('button.w-full'));
               expect(header.nativeElement.textContent).toContain('Payment Channel Info');
          });

          it('should show Expand/Collapse text', () => {
               const toggleText = fixture.debugElement.query(By.css('.btn-ghost span'));
               expect(toggleText?.nativeElement.textContent.trim()).toBe('Expand');

               component.isExpanded.set(true);
               fixture.detectChanges();

               expect(toggleText.nativeElement.textContent.trim()).toBe('Collapse');
          });

          // it('should show content only when expanded', () => {
          //      expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeFalsy();

          //      component.isExpanded.set(true);
          //      fixture.detectChanges();

          //      expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeTruthy();
          // });

          it('should render all content', () => {
               component.isExpanded.set(true);
               fixture.detectChanges();

               const text = fixture.nativeElement.textContent;
               expect(text).toContain('Payment Channels');
               expect(text).toContain('Create Channel');
               expect(text).toContain('Fund / Claim / Close');
               expect(text).toContain('Important Notes');
               expect(text).toContain('Destination');
               expect(text).toContain('Settle Delay');
               expect(text).toContain('Risks & Considerations');
          });
     });

     describe('Interactions', () => {
          it('should toggle on main header click', () => {
               const header = fixture.debugElement.query(By.css('button.w-full.flex.items-center'));
               expect(component.isExpanded()).toBeFalse();

               header.triggerEventHandler('click', new MouseEvent('click'));
               expect(component.isExpanded()).toBeTrue();
          });

          // it('should toggle on inner button click', () => {
          //      const toggleBtn = fixture.debugElement.query(By.css('.btn-ghost'));
          //      expect(component.isExpanded()).toBeFalse();

          //      toggleBtn.triggerEventHandler('click', new MouseEvent('click'));
          //      expect(component.isExpanded()).toBeTrue();
          // });
     });

     // describe('OnPush Change Detection', () => {
     //      it('should update view after signal change', () => {
     //           component.isExpanded.set(true);
     //           fixture.detectChanges();

     //           expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeTruthy();
     //      });
     // });
});

// import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
// import { PaymentChannelRequirementsInfoComponent } from './payment-channel-requirements-info.component';
// import { CommonModule } from '@angular/common';
// import { NgIcon } from '@ng-icons/core';
// import { heroInformationCircle } from '@ng-icons/heroicons/outline';
// import { icons, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
// import { provideNoopAnimations } from '@angular/platform-browser/animations';
// import { signal } from '@angular/core';
// import { By } from '@angular/platform-browser';

// describe('PaymentChannelRequirementsInfoComponent', () => {
//      let component: PaymentChannelRequirementsInfoComponent;
//      let fixture: ComponentFixture<PaymentChannelRequirementsInfoComponent>;

//      beforeEach(async () => {
//           await TestBed.configureTestingModule({
//                imports: [CommonModule, NgIcon, LucideAngularModule, PaymentChannelRequirementsInfoComponent],

//                providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, provideNgIcons({ heroInformationCircle })],
//           }).compileComponents();

//           fixture = TestBed.createComponent(PaymentChannelRequirementsInfoComponent);
//           component = fixture.componentInstance;

//           // Provide required InputSignal
//           (component.activeTab as any) = signal<'createPaymentChannel'>('createPaymentChannel');

//           fixture.detectChanges();
//      });

//      it('should create the component', () => {
//           expect(component).toBeTruthy();
//      });

//      it('should receive activeTab input', () => {
//           expect(component.activeTab()).toBe('createPaymentChannel');
//      });

//      it('should initialize collapsed', () => {
//           expect(component.isExpanded()).toBeFalse();
//      });

//      describe('Template Rendering', () => {
//           it('should render header correctly', () => {
//                const header = fixture.debugElement.query(By.css('button.w-full'));
//                expect(header.nativeElement.textContent).toContain('Payment Channel Info');
//           });

//           it('should show correct toggle text and chevron', () => {
//                let toggleSpan = fixture.debugElement.query(By.css('.btn-ghost span.hidden'));
//                expect(toggleSpan.nativeElement.textContent.trim()).toBe('Expand');

//                component.isExpanded.set(true);
//                fixture.detectChanges();

//                toggleSpan = fixture.debugElement.query(By.css('.btn-ghost span.hidden'));
//                expect(toggleSpan.nativeElement.textContent.trim()).toBe('Collapse');
//           });

//           it('should show content only when expanded', () => {
//                expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeFalsy();

//                component.isExpanded.set(true);
//                fixture.detectChanges();

//                expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeTruthy();
//           });

//           it('should render all content sections', () => {
//                component.isExpanded.set(true);
//                fixture.detectChanges();

//                const text = fixture.nativeElement.textContent;
//                expect(text).toContain('Payment Channels');
//                expect(text).toContain('Create Channel');
//                expect(text).toContain('Fund / Claim / Close');
//                expect(text).toContain('Important Notes');
//                expect(text).toContain('Destination');
//                expect(text).toContain('Settle Delay (seconds)');
//                expect(text).toContain('Risks & Considerations');
//           });
//      });

//      describe('Interactions', () => {
//           it('should toggle on header click', () => {
//                const header = fixture.debugElement.query(By.css('button.w-full.flex.items-center'));
//                expect(component.isExpanded()).toBeFalse();

//                header.triggerEventHandler('click', new MouseEvent('click'));
//                expect(component.isExpanded()).toBeTrue();

//                header.triggerEventHandler('click', new MouseEvent('click'));
//                expect(component.isExpanded()).toBeFalse();
//           });

//           it('should toggle on inner button click', () => {
//                const toggleBtn = fixture.debugElement.query(By.css('.btn-ghost'));
//                toggleBtn.triggerEventHandler('click', new MouseEvent('click'));
//                expect(component.isExpanded()).toBeTrue();
//           });
//      });

//      describe('OnPush Change Detection', () => {
//           it('should update view after signal change', () => {
//                component.isExpanded.set(true);
//                fixture.detectChanges();
//                expect(fixture.debugElement.query(By.css('div[\\@expandCollapse]'))).toBeTruthy();
//           });
//      });
// });
