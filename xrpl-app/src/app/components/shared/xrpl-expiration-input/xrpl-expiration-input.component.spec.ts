import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { XrplExpirationInputComponent } from './xrpl-expiration-input.component';
import { XrplDateService } from '../../../core/xrpl-date.service';
import * as flatpickrModule from 'flatpickr';

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

describe('XrplExpirationInputComponent', () => {
     let component: XrplExpirationInputComponent;
     let fixture: ComponentFixture<XrplExpirationInputComponent>;
     let xrplDateServiceSpy: any;

     beforeEach(async () => {
          // Reset mock instance
          mockFlatpickrInstance = createMockFlatpickrInstance();

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

          it('should destroy existing picker before creating new one', () => {
               const oldPicker = createMockFlatpickrInstance();
               component['picker'] = oldPicker;

               const flatpickrSpy = jasmine.createSpy('flatpickr').and.returnValue(mockFlatpickrInstance);
               (window as any).flatpickr = flatpickrSpy;

               component.flatpickrInput = { nativeElement: document.createElement('input') } as any;

               (component as any).initFlatpickr();

               expect(oldPicker.destroy).toHaveBeenCalled(); // ✅ correct instance
          });

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
     });

     describe('common', () => {
          function setupFlatpickr(expiration: string): {
               instance: ReturnType<typeof createMockFlatpickrInstance>;
               optionsRef: { current: any };
               flatpickrSpy: jasmine.Spy;
          } {
               const instance = createMockFlatpickrInstance();
               const optionsRef: { current: any } = { current: null };

               component.expirationSignal = signal(expiration);
               component.flatpickrInput = {
                    nativeElement: document.createElement('input'),
               } as any;

               const flatpickrSpy = jasmine.createSpy('flatpickr').and.callFake((el: any, options: any) => {
                    optionsRef.current = options;
                    return instance;
               });

               (window as any).flatpickr = flatpickrSpy;

               return { instance, optionsRef, flatpickrSpy };
          }

          // it('should initialize flatpickr with valid default date and setDate', () => {
          //      const { instance, flatpickrSpy } = setupFlatpickr('2024-01-15T10:30:00');

          //      (component as any).initFlatpickr();

          //      expect(flatpickrSpy).toHaveBeenCalled();
          //      expect(instance.setDate).toHaveBeenCalled();
          // });

          // it('should handle invalid date and not set defaultDate', () => {
          //      const { instance, flatpickrSpy } = setupFlatpickr('invalid-date');

          //      (component as any).initFlatpickr();

          //      expect(flatpickrSpy).toHaveBeenCalled();
          //      expect(instance.setDate).not.toHaveBeenCalled();
          // });

          // it('should destroy existing picker before creating new one', () => {
          //      const oldPicker = createMockFlatpickrInstance();
          //      component['picker'] = oldPicker;

          //      const { flatpickrSpy } = setupFlatpickr('2024-01-01T10:00:00');

          //      (component as any).initFlatpickr();

          //      expect(flatpickrSpy).toHaveBeenCalled();
          //      expect(oldPicker.destroy).toHaveBeenCalled();
          // });

          // it('should close picker if it is open after init', () => {
          //      const { instance } = setupFlatpickr('2024-01-01T10:00:00');
          //      instance.isOpen = true;

          //      (component as any).initFlatpickr();

          //      expect(instance.close).toHaveBeenCalled();
          // });

          // it('should call setExpiration on date change', () => {
          //      const { optionsRef } = setupFlatpickr('2024-01-01T10:00:00');

          //      (component as any).initFlatpickr();

          //      expect(optionsRef.current).toBeDefined();

          //      optionsRef.current.onChange([new Date('2024-01-01T10:00:00')]);

          //      expect(component.setExpiration).toHaveBeenCalled();
          // });

          it('should return seconds', () => {
               spyOn(Date, 'now').and.returnValue(new Date('2024-01-01T10:00:00').getTime());
               component.expirationSignal = signal('2024-01-01T10:00:10');

               expect(component.relative()).toContain('s');
          });

          it('should return minutes', () => {
               spyOn(Date, 'now').and.returnValue(new Date('2024-01-01T10:00:00').getTime());
               component.expirationSignal = signal('2024-01-01T10:05:00');

               expect(component.relative()).toContain('m');
          });

          it('should return hours', () => {
               spyOn(Date, 'now').and.returnValue(new Date('2024-01-01T10:00:00').getTime());
               component.expirationSignal = signal('2024-01-01T12:00:00');

               expect(component.relative()).toContain('h');
          });

          it('should return days', () => {
               spyOn(Date, 'now').and.returnValue(new Date('2024-01-01T10:00:00').getTime());
               component.expirationSignal = signal('2024-01-05T10:00:00');

               expect(component.relative()).toContain('d');
          });

          it('should sync enableSignal into enabled via effect', () => {
               const sig = signal(true);

               fixture = TestBed.createComponent(XrplExpirationInputComponent);
               component = fixture.componentInstance;

               component.expirationSignal = signal('');
               component.setExpiration = jasmine.createSpy('setExpiration');
               component.enableSignal = sig;
               component.setEnable = jasmine.createSpy('setEnable');

               fixture.detectChanges();

               expect(component.enabled()).toBeTrue();

               sig.set(false);
               fixture.detectChanges();

               expect(component.enabled()).toBeFalse();
          });

          it('should format date correctly', () => {
               const date = new Date('2024-01-01T05:06:07');
               const result = (component as any).formatDateTime(date);

               expect(result).toBe('2024-01-01T05:06:07');
          });

          it('should call initFlatpickr when opening picker', fakeAsync(() => {
               spyOn<any>(component, 'initFlatpickr');

               component.flatpickrInput = {
                    nativeElement: document.createElement('input'),
               } as any;

               component.togglePicker();
               tick(110);

               expect(component['initFlatpickr']).toHaveBeenCalled();
          }));

          it('should not throw if setEnable is undefined', () => {
               component.setEnable = undefined as any;

               const event = { target: { checked: true } } as any;

               expect(() => component.toggle(event)).not.toThrow();
          });
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
