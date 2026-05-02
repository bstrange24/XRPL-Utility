import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FlagSelectorComponent, FlagOption } from './flag-selector.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

// Define a single test interface
interface TestFlags {
     flag1: boolean;
     flag2: boolean;
     flag3: boolean;
}

describe('FlagSelectorComponent', () => {
     let component: FlagSelectorComponent<keyof TestFlags>;
     let fixture: ComponentFixture<FlagSelectorComponent<keyof TestFlags>>;

     // Mock flag configuration
     const mockFlagsConfig: FlagOption<keyof TestFlags>[] = [
          { key: 'flag1', label: 'Flag 1', hex: '0x00000001', description: 'Description for flag 1' },
          { key: 'flag2', label: 'Flag 2', hex: '0x00000002', description: 'Description for flag 2' },
          { key: 'flag3', label: 'Flag 3', hex: '0x00000004', description: 'Description for flag 3' },
     ];

     // Mock flags state
     let mockFlags: Record<keyof TestFlags, boolean>;
     let mockToggleFlag: jasmine.Spy;

     beforeEach(async () => {
          // Initialize mock data
          mockFlags = {
               flag1: false,
               flag2: false,
               flag3: false,
          };

          mockToggleFlag = jasmine.createSpy('toggleFlag');

          await TestBed.configureTestingModule({
               imports: [FlagSelectorComponent<keyof TestFlags>],
               providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          }).compileComponents();

          fixture = TestBed.createComponent(FlagSelectorComponent<keyof TestFlags>);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('title', 'Test Flags');
          fixture.componentRef.setInput('flagsConfig', mockFlagsConfig);
          fixture.componentRef.setInput('flags', mockFlags);
          fixture.componentRef.setInput('totalValue', 0);
          fixture.componentRef.setInput('totalHex', '0x0');
          fixture.componentRef.setInput('toggleFlag', mockToggleFlag);

          fixture.detectChanges();
     });

     afterEach(() => {
          mockToggleFlag.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept title input', () => {
               expect(component.title()).toBe('Test Flags');
          });

          it('should accept flagsConfig input', () => {
               expect(component.flagsConfig()).toEqual(mockFlagsConfig);
               expect(component.flagsConfig().length).toBe(3);
          });

          it('should accept flags input', () => {
               expect(component.flags()).toEqual(mockFlags);
          });

          it('should accept totalValue input', () => {
               expect(component.totalValue()).toBe(0);
          });

          it('should accept totalHex input', () => {
               expect(component.totalHex()).toBe('0x0');
          });

          it('should accept toggleFlag input', () => {
               expect(component.toggleFlag()).toBe(mockToggleFlag);
          });
     });

     describe('isFlagSet', () => {
          it('should return true when flag is true', () => {
               fixture.componentRef.setInput('flags', { ...mockFlags, flag1: true });
               fixture.detectChanges();

               const result = component.isFlagSet('flag1');
               expect(result).toBeTrue();
          });

          it('should return false when flag is false', () => {
               const result = component.isFlagSet('flag2');
               expect(result).toBeFalse();
          });

          it('should return false when flag key does not exist', () => {
               const result = component.isFlagSet('nonexistent' as keyof TestFlags);
               expect(result).toBeFalse();
          });

          it('should handle undefined flags object', () => {
               fixture.componentRef.setInput('flags', undefined);
               fixture.detectChanges();

               const result = component.isFlagSet('flag1');
               expect(result).toBeFalse();
          });
     });

     describe('Template bindings', () => {
          it('should display title', () => {
               const titleElement = fixture.debugElement.nativeElement.querySelector('.text-sm.font-semibold');
               expect(titleElement.textContent).toContain('Test Flags');
          });

          it('should render all flag options', () => {
               const flagLabels = fixture.debugElement.nativeElement.querySelectorAll('.text-sm.font-medium');
               expect(flagLabels.length).toBe(3);
               expect(flagLabels[0].textContent).toContain('Flag 1');
               expect(flagLabels[1].textContent).toContain('Flag 2');
               expect(flagLabels[2].textContent).toContain('Flag 3');
          });

          it('should display flag hex values', () => {
               const hexValues = fixture.debugElement.nativeElement.querySelectorAll('.font-mono.text-xs');
               expect(hexValues[0].textContent).toContain('0x00000001');
               expect(hexValues[1].textContent).toContain('0x00000002');
               expect(hexValues[2].textContent).toContain('0x00000004');
          });

          it('should display flag descriptions', () => {
               const descriptions = fixture.debugElement.nativeElement.querySelectorAll('.text-xs.text-gray-600');
               expect(descriptions[0].textContent).toContain('Description for flag 1');
               expect(descriptions[1].textContent).toContain('Description for flag 2');
               expect(descriptions[2].textContent).toContain('Description for flag 3');
          });

          it('should display total value and hex', () => {
               fixture.componentRef.setInput('totalValue', 7);
               fixture.componentRef.setInput('totalHex', '0x00000007');
               fixture.detectChanges();

               const totalValueElement = fixture.debugElement.nativeElement.querySelector('.font-mono.text-sm.font-semibold');
               expect(totalValueElement.textContent).toContain('7');
               expect(totalValueElement.textContent).toContain('(0x00000007)');
          });
     });

     describe('Flag toggling', () => {
          it('should call toggleFlag with correct key when checkbox is clicked', () => {
               const checkboxes = fixture.debugElement.nativeElement.querySelectorAll('input[type="checkbox"]');

               // Click the first checkbox
               (checkboxes[0] as HTMLElement).click();

               expect(mockToggleFlag).toHaveBeenCalledWith('flag1');
          });

          it('should call toggleFlag for each flag when clicked', () => {
               const checkboxes = fixture.debugElement.nativeElement.querySelectorAll('input[type="checkbox"]');

               (checkboxes[0] as HTMLElement).click();
               (checkboxes[1] as HTMLElement).click();
               (checkboxes[2] as HTMLElement).click();

               expect(mockToggleFlag).toHaveBeenCalledTimes(3);
               expect(mockToggleFlag).toHaveBeenCalledWith('flag1');
               expect(mockToggleFlag).toHaveBeenCalledWith('flag2');
               expect(mockToggleFlag).toHaveBeenCalledWith('flag3');
          });
     });

     describe('Flag styling', () => {
          it('should apply border-green-500 class when flag is set', () => {
               fixture.componentRef.setInput('flags', { ...mockFlags, flag1: true });
               fixture.detectChanges();

               const flagLabel = fixture.debugElement.nativeElement.querySelector('.border-green-500');
               expect(flagLabel).toBeTruthy();
          });

          it('should apply bg-green-50 class when flag is set', () => {
               fixture.componentRef.setInput('flags', { ...mockFlags, flag2: true });
               fixture.detectChanges();

               const flagLabel = fixture.debugElement.nativeElement.querySelector('.bg-green-50');
               expect(flagLabel).toBeTruthy();
          });

          it('should show check icon when flag is set', () => {
               fixture.componentRef.setInput('flags', { ...mockFlags, flag3: true });
               fixture.detectChanges();

               const checkIcon = fixture.debugElement.nativeElement.querySelector('lucide-icon[name="check"]');
               expect(checkIcon).toBeTruthy();
          });

          it('should not show check icon when flag is not set', () => {
               const checkIcon = fixture.debugElement.nativeElement.querySelector('lucide-icon[name="check"]');
               expect(checkIcon).toBeNull();
          });
     });

     describe('Input updates', () => {
          it('should update title when changed', () => {
               fixture.componentRef.setInput('title', 'New Title');
               fixture.detectChanges();
               expect(component.title()).toBe('New Title');
          });

          it('should update totalValue when changed', () => {
               fixture.componentRef.setInput('totalValue', 7);
               fixture.detectChanges();
               expect(component.totalValue()).toBe(7);
          });

          it('should update totalHex when changed', () => {
               fixture.componentRef.setInput('totalHex', '0x00000007');
               fixture.detectChanges();
               expect(component.totalHex()).toBe('0x00000007');
          });
     });

     describe('Edge cases', () => {
          it('should handle empty flagsConfig array', () => {
               fixture.componentRef.setInput('flagsConfig', []);
               fixture.detectChanges();

               const flagLabels = fixture.debugElement.nativeElement.querySelectorAll('.text-sm.font-medium');
               expect(flagLabels.length).toBe(0);
          });

          it('should handle partial flags object', () => {
               const partialFlags = { flag1: true } as Partial<Record<keyof TestFlags, boolean>>;
               fixture.componentRef.setInput('flags', partialFlags);
               fixture.detectChanges();

               expect(component.isFlagSet('flag1')).toBeTrue();
               expect(component.isFlagSet('flag2')).toBeFalse();
          });

          it('should handle numeric totalValue', () => {
               fixture.componentRef.setInput('totalValue', 123);
               fixture.detectChanges();

               expect(component.totalValue()).toBe(123);
          });

          it('should handle string totalValue', () => {
               fixture.componentRef.setInput('totalValue', '123');
               fixture.detectChanges();

               expect(component.totalValue()).toBe('123');
          });
     });
});
