import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { XrplExpirationInputComponent } from './xrpl-expiration-input.component';
import { XrplDateService } from '../../../core/xrpl-date.service';

// Mock flatpickr instance
const createMockFlatpickrInstance = () => ({
     destroy: jasmine.createSpy('destroy'),
     setDate: jasmine.createSpy('setDate'),
     open: jasmine.createSpy('open'),
     close: jasmine.createSpy('close'),
     clear: jasmine.createSpy('clear'),
     isOpen: false,
});

let mockFlatpickrInstance = createMockFlatpickrInstance();

// Mock flatpickr function
function mockFlatpickrFn(element: any, options: any) {
     return mockFlatpickrInstance;
}

// Replace flatpickr on window object
(window as any).flatpickr = mockFlatpickrFn;

describe('XrplExpirationInputComponent', () => {
     let component: XrplExpirationInputComponent;
     let fixture: ComponentFixture<XrplExpirationInputComponent>;
     let xrplDateServiceSpy: any;

     beforeEach(async () => {
          // Reset mock instance
          mockFlatpickrInstance = createMockFlatpickrInstance();
          (window as any).flatpickr = mockFlatpickrFn;

          xrplDateServiceSpy = jasmine.createSpyObj('XrplDateService', ['formatDateTimeLocal', 'toRippleTime']);
          xrplDateServiceSpy.formatDateTimeLocal.and.callFake((date: Date) => {
               const year = date.getFullYear();
               const month = String(date.getMonth() + 1).padStart(2, '0');
               const day = String(date.getDate()).padStart(2, '0');
               const hours = String(date.getHours()).padStart(2, '0');
               const minutes = String(date.getMinutes()).padStart(2, '0');
               const seconds = String(date.getSeconds()).padStart(2, '0');
               return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          });
          xrplDateServiceSpy.toRippleTime.and.returnValue(710000000);

          await TestBed.configureTestingModule({
               imports: [XrplExpirationInputComponent],
               providers: [{ provide: XrplDateService, useValue: xrplDateServiceSpy }],
          }).compileComponents();

          fixture = TestBed.createComponent(XrplExpirationInputComponent);
          component = fixture.componentInstance;

          // Set required inputs
          component.expirationSignal = signal('');
          component.setExpiration = jasmine.createSpy('setExpiration');
          component.enableSignal = signal(false);
          component.setEnable = jasmine.createSpy('setEnable');

          fixture.detectChanges();
     });

     afterEach(() => {
          if (component['picker']) {
               component['picker'].destroy();
               component['picker'] = null;
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should accept expirationSignal input', () => {
               const testSignal = signal('2024-01-01T00:00:00');
               component.expirationSignal = testSignal;
               expect(component.expirationSignal()).toBe('2024-01-01T00:00:00');
          });

          it('should accept setExpiration function', () => {
               const fn = jasmine.createSpy('setExpiration');
               component.setExpiration = fn;
               component.setExpiration('test');
               expect(fn).toHaveBeenCalledWith('test');
          });

          it('should accept enableSignal input', () => {
               const testSignal = signal(true);
               component.enableSignal = testSignal;
               fixture.detectChanges();
               expect(component.enableSignal()).toBeTrue();
          });

          it('should accept label input', () => {
               component.label = 'Custom Label';
               expect(component.label).toBe('Custom Label');
          });

          it('should accept hint input', () => {
               component.hint = 'Custom hint';
               expect(component.hint).toBe('Custom hint');
          });
     });

     // describe('Effect - sync enableSignal', () => {
     //      it('should sync enableSignal to enabled signal', fakeAsync(() => {
     //           // Create a new component instance with the test signal
     //           const testSignal = signal(true);
     //           component.enableSignal = testSignal;
     //           // Manually trigger the effect by changing the signal and detecting changes
     //           component.enabled.set(false); // Start with false
     //           fixture.detectChanges();
     //           tick(50);
     //           // The effect should have set enabled to match the signal
     //           // Note: The effect runs in the constructor, so we need to ensure it's triggered
     //           expect(component.enabled()).toBeTrue();
     //      }));
     // });

     describe('formatted computed', () => {
          it('should return empty string when no expiration', () => {
               component.expirationSignal = signal('');
               expect(component.formatted()).toBe('');
          });

          it('should format expiration date', () => {
               component.expirationSignal = signal('2024-01-15T10:30:00');
               expect(component.formatted()).toContain('2024');
          });
     });

     describe('relative computed', () => {
          let nowSpy: jasmine.Spy;

          beforeEach(() => {
               nowSpy = spyOn(Date, 'now').and.returnValue(new Date('2024-01-01T10:00:00').getTime());
          });

          afterEach(() => {
               nowSpy.and.callThrough();
          });

          it('should return empty string when no expiration', () => {
               component.expirationSignal = signal('');
               expect(component.relative()).toBe('');
          });

          it('should return "expired" when date is in the past', () => {
               component.expirationSignal = signal('2024-01-01T09:00:00');
               expect(component.relative()).toBe('expired');
          });

          it('should return relative time when expiration is in the future', () => {
               component.expirationSignal = signal('2024-01-03T10:00:00');
               expect(component.relative()).toContain('in');
          });
     });

     describe('togglePicker', () => {
          it('should show picker and initialize flatpickr', fakeAsync(() => {
               // Create a mock input element
               const mockInput = document.createElement('input');
               component.flatpickrInput = { nativeElement: mockInput } as any;

               component.togglePicker();
               expect(component.showPicker).toBeTrue();
               tick(110);
               expect(component['picker']).toBeTruthy();
          }));

          it('should hide picker and destroy flatpickr', () => {
               component.showPicker = true;
               component['picker'] = mockFlatpickrInstance;
               component.togglePicker();
               expect(component.showPicker).toBeFalse();
               expect(mockFlatpickrInstance.destroy).toHaveBeenCalled();
               expect(component['picker']).toBeNull();
          });
     });

     describe('toggle (enable expiration)', () => {
          it('should enable expiration when checked', () => {
               const event = { target: { checked: true } } as any;
               component.toggle(event);
               expect(component.enabled()).toBeTrue();
               expect(component.setEnable).toHaveBeenCalledWith(true);
          });

          it('should disable expiration and clear value when unchecked', () => {
               const event = { target: { checked: false } } as any;
               component.toggle(event);
               expect(component.enabled()).toBeFalse();
               expect(component.setEnable).toHaveBeenCalledWith(false);
               expect(component.setExpiration).toHaveBeenCalledWith('');
          });

          it('should set now when enabling and no expiration exists', () => {
               spyOn(component, 'setNow');
               const event = { target: { checked: true } } as any;
               component.expirationSignal = signal('');
               component.toggle(event);
               expect(component.setNow).toHaveBeenCalled();
          });

          it('should not set now when enabling and expiration already exists', () => {
               spyOn(component, 'setNow');
               const event = { target: { checked: true } } as any;
               component.expirationSignal = signal('2024-01-01T10:00:00');
               component.toggle(event);
               expect(component.setNow).not.toHaveBeenCalled();
          });
     });

     describe('setNow', () => {
          it('should set expiration to current time', () => {
               const mockDate = new Date('2024-01-15T14:30:00');
               jasmine.clock().install();
               jasmine.clock().mockDate(mockDate);
               xrplDateServiceSpy.formatDateTimeLocal.and.returnValue('2024-01-15T14:30:00');

               component.setNow();
               expect(component.setExpiration).toHaveBeenCalledWith('2024-01-15T14:30:00');

               jasmine.clock().uninstall();
          });

          it('should update picker if exists', () => {
               component['picker'] = mockFlatpickrInstance;
               component.setNow();
               expect(mockFlatpickrInstance.setDate).toHaveBeenCalled();
          });
     });

     describe('setFromNow', () => {
          it('should set expiration to current time plus seconds', () => {
               const mockDate = new Date('2024-01-01T10:00:00');
               jasmine.clock().install();
               jasmine.clock().mockDate(mockDate);
               xrplDateServiceSpy.formatDateTimeLocal.and.returnValue('2024-01-01T10:05:00');

               component.setFromNow(300);
               expect(component.setExpiration).toHaveBeenCalledWith('2024-01-01T10:05:00');

               jasmine.clock().uninstall();
          });

          it('should update picker if exists', () => {
               component['picker'] = mockFlatpickrInstance;
               component.setFromNow(60);
               expect(mockFlatpickrInstance.setDate).toHaveBeenCalled();
          });
     });

     describe('addSeconds', () => {
          beforeEach(() => {
               jasmine.clock().install();
               jasmine.clock().mockDate(new Date('2024-01-01T10:00:00'));
          });

          afterEach(() => {
               jasmine.clock().uninstall();
          });

          it('should add seconds to existing expiration', () => {
               component.expirationSignal = signal('2024-01-01T10:00:00');
               xrplDateServiceSpy.formatDateTimeLocal.and.returnValue('2024-01-01T10:00:30');

               component.addSeconds(30);
               expect(component.setExpiration).toHaveBeenCalled();
          });

          it('should call setFromNow when no expiration exists', () => {
               spyOn(component, 'setFromNow');
               component.expirationSignal = signal('');
               component.addSeconds(60);
               expect(component.setFromNow).toHaveBeenCalledWith(60);
          });

          it('should update picker if exists', () => {
               component.expirationSignal = signal('2024-01-01T10:00:00');
               component['picker'] = mockFlatpickrInstance;
               component.addSeconds(30);
               expect(mockFlatpickrInstance.setDate).toHaveBeenCalled();
          });
     });

     describe('clear', () => {
          it('should clear expiration', () => {
               component.clear();
               expect(component.setExpiration).toHaveBeenCalledWith('');
          });

          it('should clear picker if exists', () => {
               component['picker'] = mockFlatpickrInstance;
               component.clear();
               expect(mockFlatpickrInstance.clear).toHaveBeenCalled();
          });
     });

     describe('openPicker', () => {
          it('should open picker if exists', () => {
               component['picker'] = mockFlatpickrInstance;
               component.openPicker();
               expect(mockFlatpickrInstance.open).toHaveBeenCalled();
          });

          it('should not error if picker does not exist', () => {
               component['picker'] = null;
               expect(() => component.openPicker()).not.toThrow();
          });
     });

     describe('ngAfterViewInit', () => {
          it('should be defined', () => {
               expect(component.ngAfterViewInit).toBeDefined();
          });
     });

     describe('ngOnDestroy', () => {
          it('should destroy picker', () => {
               component['picker'] = mockFlatpickrInstance;
               component.ngOnDestroy();
               expect(mockFlatpickrInstance.destroy).toHaveBeenCalled();
               expect(component['picker']).toBeNull();
          });

          it('should not error if picker is null', () => {
               component['picker'] = null;
               expect(() => component.ngOnDestroy()).not.toThrow();
          });
     });

     describe('initFlatpickr', () => {
          let mockElement: any;

          beforeEach(() => {
               mockElement = { nativeElement: document.createElement('input') };
               component.flatpickrInput = mockElement;
               // Create a spy for flatpickr
               mockFlatpickrInstance = createMockFlatpickrInstance();
               (window as any).flatpickr = jasmine.createSpy('flatpickr').and.returnValue(mockFlatpickrInstance);
          });

          it('should not initialize if element is missing', () => {
               component.flatpickrInput = null as any;
               (component as any).initFlatpickr();
               expect((window as any).flatpickr).not.toHaveBeenCalled();
          });

          // it('should initialize flatpickr with default date from expirationSignal', () => {
          //      component.expirationSignal = signal('2024-01-15T10:30:00');
          //      (component as any).initFlatpickr();
          //      expect((window as any).flatpickr).toHaveBeenCalled();
          // });
     });
});

// Test Host Component
@Component({
     template: ` <app-xrpl-expiration-input [expirationSignal]="expirationSignal" [setExpiration]="setExpiration" [enableSignal]="enableSignal" [setEnable]="setEnable" label="Test Label" hint="Test Hint" /> `,
     standalone: true,
     imports: [XrplExpirationInputComponent],
})
class TestHostComponent {
     expirationSignal = signal('');
     enableSignal = signal(false);
     setExpiration = jasmine.createSpy('setExpiration');
     setEnable = jasmine.createSpy('setEnable');
}

describe('XrplExpirationInputComponent Host', () => {
     let hostFixture: ComponentFixture<TestHostComponent>;
     let hostComponent: TestHostComponent;
     let xrplDateServiceSpy: any;

     beforeEach(async () => {
          xrplDateServiceSpy = jasmine.createSpyObj('XrplDateService', ['formatDateTimeLocal']);

          await TestBed.configureTestingModule({
               imports: [TestHostComponent],
               providers: [{ provide: XrplDateService, useValue: xrplDateServiceSpy }],
          }).compileComponents();

          hostFixture = TestBed.createComponent(TestHostComponent);
          hostComponent = hostFixture.componentInstance;
          hostFixture.detectChanges();
     });

     it('should create host component', () => {
          expect(hostComponent).toBeTruthy();
     });
});
