import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TooltipLinkComponent } from './tooltip-link.component';

// Helper component to test content projection
@Component({
     template: `<app-tooltip-link href="https://example.com" tooltipText="Test Tooltip">Click me</app-tooltip-link>`,
     imports: [TooltipLinkComponent],
})
class TestHostComponent {}

describe('TooltipLinkComponent', () => {
     let component: TooltipLinkComponent;
     let fixture: ComponentFixture<TooltipLinkComponent>;
     let anchor: DebugElement;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TooltipLinkComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(TooltipLinkComponent);
          component = fixture.componentInstance;

          // Set required inputs
          component.href = 'https://example.com';
          component.tooltipText = 'Test Tooltip';

          fixture.detectChanges();
          anchor = fixture.debugElement.query(By.css('a'));
     });

     afterEach(() => {
          // Clean up any tooltip elements left in DOM
          const tooltip = document.querySelector('.app-tooltip');
          if (tooltip) tooltip.remove();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept href input', () => {
               expect(component.href).toBe('https://example.com');
          });

          it('should accept tooltipText input', () => {
               expect(component.tooltipText).toBe('Test Tooltip');
          });

          it('should handle empty href', () => {
               component.href = '';
               fixture.detectChanges();
               expect(component.href).toBe('');
          });

          it('should handle empty tooltipText', () => {
               component.tooltipText = '';
               fixture.detectChanges();
               expect(component.tooltipText).toBe('');
          });
     });

     describe('Template', () => {
          it('should render anchor with correct href', () => {
               expect(anchor.nativeElement.getAttribute('href')).toBe('https://example.com');
          });

          it('should have target="_blank" and rel="noopener noreferrer"', () => {
               expect(anchor.nativeElement.getAttribute('target')).toBe('_blank');
               expect(anchor.nativeElement.getAttribute('rel')).toBe('noopener noreferrer');
          });

          it('should project content', () => {
               const hostFixture = TestBed.createComponent(TestHostComponent);
               hostFixture.detectChanges();
               const hostAnchor = hostFixture.debugElement.query(By.css('a'));
               expect(hostAnchor.nativeElement.textContent).toContain('Click me');
          });
     });

     describe('Tooltip creation and display', () => {
          it('should create tooltip element on showTooltip', () => {
               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeTruthy();
               expect(tooltip?.textContent).toBe('Test Tooltip');
          });

          // it('should remove tooltip on hideTooltip', () => {
          //      (component as any).showTooltip();
          //      expect(document.querySelector('.app-tooltip')).toBeTruthy();

          //      (component as any).hideTooltip();
          //      // Wait for setTimeout to complete
          //      setTimeout(() => {
          //           expect(document.querySelector('.app-tooltip')).toBeFalsy();
          //      }, 200);
          // });

          it('should not create tooltip when tooltipText is empty', () => {
               component.tooltipText = '';
               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeFalsy();
          });
     });

     describe('mouseenter event', () => {
          it('should show tooltip on mouseenter after delay', done => {
               component.onMouseEnter();
               expect(document.querySelector('.app-tooltip')).toBeFalsy();

               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeTruthy();
                    done();
               }, 200);
          });

          it('should cancel previous hide timeout on mouseenter', done => {
               // First trigger mouseleave to set a hide timeout
               component.onMouseLeave();
               // Then mouseenter should cancel that timeout and show the tooltip
               component.onMouseEnter();

               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeTruthy();
                    done();
               }, 200);
          });
     });

     describe('mouseleave event', () => {
          it('should hide tooltip on mouseleave after delay', done => {
               component.onMouseEnter();

               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeTruthy();
                    component.onMouseLeave();

                    // Wait for hide delay (60ms) + DOM removal (150ms)
                    setTimeout(() => {
                         expect(document.querySelector('.app-tooltip')).toBeFalsy();
                         done();
                    }, 300);
               }, 200);
          });

          it('should cancel previous show timeout on mouseleave', done => {
               component.onMouseEnter();
               component.onMouseLeave();

               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeFalsy();
                    done();
               }, 200);
          });
     });

     describe('focus event', () => {
          it('should show tooltip on focus after delay', done => {
               component.onFocus();
               expect(document.querySelector('.app-tooltip')).toBeFalsy();

               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeTruthy();
                    done();
               }, 200);
          });
     });

     describe('blur event', () => {
          it('should hide tooltip on blur after delay', done => {
               // First focus to show tooltip
               component.onFocus();

               setTimeout(() => {
                    const tooltip = document.querySelector('.app-tooltip');
                    expect(tooltip).toBeTruthy();
                    component.onBlur();

                    // Wait for hide delay (60ms) + DOM removal (150ms)
                    setTimeout(() => {
                         expect(document.querySelector('.app-tooltip')).toBeFalsy();
                         done();
                    }, 300);
               }, 200);
          });
     });

     describe('onKeyDown behavior', () => {
          it('should call showTooltipWithDelay for Enter key', () => {
               spyOn(component as any, 'showTooltipWithDelay');
               const event = new KeyboardEvent('keydown', { key: 'Enter' });
               component.onKeyDown(event);
               expect((component as any).showTooltipWithDelay).toHaveBeenCalled();
          });

          it('should call showTooltipWithDelay and preventDefault for Space key', () => {
               spyOn(component as any, 'showTooltipWithDelay');
               const event = new KeyboardEvent('keydown', { key: ' ' });
               spyOn(event, 'preventDefault');
               component.onKeyDown(event);
               expect(event.preventDefault).toHaveBeenCalled();
               expect((component as any).showTooltipWithDelay).toHaveBeenCalled();
          });

          it('should not call showTooltipWithDelay for other keys', () => {
               spyOn(component as any, 'showTooltipWithDelay');
               const event = new KeyboardEvent('keydown', { key: 'Tab' });
               component.onKeyDown(event);
               expect((component as any).showTooltipWithDelay).not.toHaveBeenCalled();
          });
     });

     describe('Tooltip positioning', () => {
          let originalInnerWidth: number;
          let originalInnerHeight: number;

          beforeEach(() => {
               originalInnerWidth = window.innerWidth;
               originalInnerHeight = window.innerHeight;
          });

          afterEach(() => {
               // Restore original values
               Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
          });

          it('should position tooltip above when space available', () => {
               const mockHostRect = new DOMRect(100, 200, 50, 20);
               const mockTooltipRect = new DOMRect(0, 0, 80, 30);

               Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

               spyOn(component['host'].nativeElement, 'getBoundingClientRect').and.returnValue(mockHostRect);
               (component as any).createTooltip();
               spyOn((component as any).tooltipEl, 'getBoundingClientRect').and.returnValue(mockTooltipRect);

               (component as any).showTooltip();

               const expectedTop = mockHostRect.top - mockTooltipRect.height - 8;
               expect((component as any).tooltipEl.style.top).toBe(`${expectedTop}px`);
          });

          it('should position tooltip below when not enough space above', () => {
               const mockHostRect = new DOMRect(100, 10, 50, 20);
               const mockTooltipRect = new DOMRect(0, 0, 80, 30);

               Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

               spyOn(component['host'].nativeElement, 'getBoundingClientRect').and.returnValue(mockHostRect);
               (component as any).createTooltip();
               spyOn((component as any).tooltipEl, 'getBoundingClientRect').and.returnValue(mockTooltipRect);

               (component as any).showTooltip();

               const expectedTop = mockHostRect.bottom + 8;
               expect((component as any).tooltipEl.style.top).toBe(`${expectedTop}px`);
          });

          it('should clamp tooltip horizontally within viewport', () => {
               const mockHostRect = new DOMRect(0, 100, 50, 20);
               const mockTooltipRect = new DOMRect(0, 0, 80, 30);

               Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

               spyOn(component['host'].nativeElement, 'getBoundingClientRect').and.returnValue(mockHostRect);
               (component as any).createTooltip();
               spyOn((component as any).tooltipEl, 'getBoundingClientRect').and.returnValue(mockTooltipRect);

               (component as any).showTooltip();

               const left = parseInt((component as any).tooltipEl.style.left);
               expect(left).toBeGreaterThanOrEqual(6);
          });
     });

     describe('Tooltip creation and cleanup', () => {
          it('should not create duplicate tooltips', () => {
               (component as any).createTooltip();
               (component as any).createTooltip();
               const tooltips = document.querySelectorAll('.app-tooltip');
               expect(tooltips.length).toBe(1);
          });

          it('should clean up tooltip on ngOnDestroy', done => {
               (component as any).showTooltip();
               expect(document.querySelector('.app-tooltip')).toBeTruthy();

               component.ngOnDestroy();
               setTimeout(() => {
                    expect(document.querySelector('.app-tooltip')).toBeFalsy();
                    done();
               }, 200);
          });

          it('should handle missing tooltipEl in hideTooltip', () => {
               (component as any).tooltipEl = null;
               expect(() => (component as any).hideTooltip()).not.toThrow();
          });
     });

     describe('Timeout management', () => {
          it('should clear timeouts on mouseenter/mouseleave', () => {
               spyOn(globalThis, 'clearTimeout');
               component.onMouseEnter();
               component.onMouseLeave();
               expect(globalThis.clearTimeout).toHaveBeenCalled();
          });
     });

     describe('handleSpacePreventDefault', () => {
          it('should prevent default on space key', () => {
               const event = new KeyboardEvent('keydown', { key: ' ' });
               spyOn(event, 'preventDefault');
               component.handleSpacePreventDefault(event);
               expect(event.preventDefault).toHaveBeenCalled();
          });
     });

     describe('CSS class application', () => {
          it('should add tooltip class to tooltip element', () => {
               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeTruthy();
               expect(tooltip?.classList.contains('app-tooltip')).toBeTrue();
          });
     });

     describe('Edge cases', () => {
          it('should handle extremely long tooltip text', () => {
               const longText = 'A'.repeat(500);
               component.tooltipText = longText;
               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeTruthy();
               expect(tooltip?.textContent).toBe(longText);
          });

          it('should handle tooltip when window is very small', () => {
               const originalInnerWidth = window.innerWidth;
               const originalInnerHeight = window.innerHeight;

               Object.defineProperty(window, 'innerWidth', { value: 100, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: 100, configurable: true });

               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeTruthy();

               // Restore
               Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
               Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
          });

          it('should handle tooltip when element is near edge of screen', () => {
               const mockHostRect = new DOMRect(10, 10, 50, 20);
               spyOn(component['host'].nativeElement, 'getBoundingClientRect').and.returnValue(mockHostRect);

               (component as any).showTooltip();
               const tooltip = document.querySelector('.app-tooltip');
               expect(tooltip).toBeTruthy();
          });
     });
});
