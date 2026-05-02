import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SummaryItemComponent } from './summary-item.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

// Test component for content projection
@Component({
     template: `
          <app-summary-item [selected]="selected" [copyValue]="copyValue" [copyTooltip]="copyTooltip" [secondaryCopyValue]="secondaryCopyValue" [secondaryCopyTooltip]="secondaryCopyTooltip" [isExpired]="isExpired" (onClick)="handleClick()" (onCopyClick)="handleCopy($event)" (secondaryCopyClick)="handleSecondaryCopy($event)">
               <div item-content>
                    <div class="test-content">Test Item Content</div>
               </div>
          </app-summary-item>
     `,
     imports: [SummaryItemComponent],
})
class TestHostComponent {
     selected = false;
     copyValue = '';
     copyTooltip = 'Copy to clipboard';
     secondaryCopyValue = '';
     secondaryCopyTooltip = 'Copy to clipboard';
     isExpired = false;

     clickCount = 0;
     copiedValue = '';
     secondaryCopiedValue = '';

     handleClick() {
          this.clickCount++;
     }

     handleCopy(value: string) {
          this.copiedValue = value;
     }

     handleSecondaryCopy(value: string) {
          this.secondaryCopiedValue = value;
     }
}

describe('SummaryItemComponent', () => {
     let component: SummaryItemComponent;
     let fixture: ComponentFixture<SummaryItemComponent>;
     let hostComponent: TestHostComponent;
     let hostFixture: ComponentFixture<TestHostComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SummaryItemComponent, TestHostComponent],
               providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          }).compileComponents();

          fixture = TestBed.createComponent(SummaryItemComponent);
          component = fixture.componentInstance;

          // Set default inputs
          fixture.componentRef.setInput('selected', false);
          fixture.componentRef.setInput('copyValue', '');
          fixture.componentRef.setInput('copyTooltip', 'Copy to clipboard');
          fixture.componentRef.setInput('secondaryCopyValue', '');
          fixture.componentRef.setInput('secondaryCopyTooltip', 'Copy to clipboard');
          fixture.componentRef.setInput('isExpired', false);

          fixture.detectChanges();

          // Create host component for content projection tests
          hostFixture = TestBed.createComponent(TestHostComponent);
          hostComponent = hostFixture.componentInstance;
          hostFixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept selected input', () => {
               expect(component.selected()).toBeFalse();
          });

          it('should accept copyValue input', () => {
               expect(component.copyValue()).toBe('');
          });

          it('should accept copyTooltip input', () => {
               expect(component.copyTooltip()).toBe('Copy to clipboard');
          });

          it('should accept secondaryCopyValue input', () => {
               expect(component.secondaryCopyValue()).toBe('');
          });

          it('should accept secondaryCopyTooltip input', () => {
               expect(component.secondaryCopyTooltip()).toBe('Copy to clipboard');
          });

          it('should accept isExpired input', () => {
               expect(component.isExpired()).toBeFalse();
          });

          it('should update inputs when changed', () => {
               fixture.componentRef.setInput('selected', true);
               fixture.componentRef.setInput('copyValue', 'test-value');
               fixture.componentRef.setInput('isExpired', true);
               fixture.detectChanges();

               expect(component.selected()).toBeTrue();
               expect(component.copyValue()).toBe('test-value');
               expect(component.isExpired()).toBeTrue();
          });
     });

     describe('Output signals', () => {
          it('should have onClick output', () => {
               expect(component.onClick).toBeDefined();
               expect(component.onClick.emit).toBeDefined();
          });

          it('should have onCopyClick output', () => {
               expect(component.onCopyClick).toBeDefined();
               expect(component.onCopyClick.emit).toBeDefined();
          });

          it('should have secondaryCopyClick output', () => {
               expect(component.secondaryCopyClick).toBeDefined();
               expect(component.secondaryCopyClick.emit).toBeDefined();
          });
     });

     describe('Template rendering - Base styles', () => {
          let liElement: DebugElement;

          beforeEach(() => {
               liElement = fixture.debugElement.query(By.css('li'));
          });

          it('should render li element with correct classes', () => {
               expect(liElement).toBeTruthy();
               expect(liElement.classes['group']).toBeTrue();
               expect(liElement.classes['cursor-pointer']).toBeTrue();
          });

          it('should apply selected styles when selected is true', () => {
               fixture.componentRef.setInput('selected', true);
               fixture.detectChanges();

               expect(liElement.classes['bg-blue-50']).toBeTrue();
               expect(liElement.classes['border-blue-300']).toBeTrue();
          });

          it('should apply expired styles when isExpired is true', () => {
               fixture.componentRef.setInput('isExpired', true);
               fixture.detectChanges();

               expect(liElement.classes['border-red-200']).toBeTrue();
          });
     });

     describe('Template rendering - Content projection', () => {
          it('should project item-content', () => {
               const projectedContent = hostFixture.debugElement.query(By.css('.test-content'));
               expect(projectedContent).toBeTruthy();
               expect(projectedContent.nativeElement.textContent).toContain('Test Item Content');
          });
     });

     describe('Template rendering - Copy buttons', () => {
          it('should show copy button when copyValue is provided', () => {
               fixture.componentRef.setInput('copyValue', 'test-id');
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('button:first-child'));
               expect(copyButton).toBeTruthy();
          });

          it('should not show copy button when copyValue is empty', () => {
               fixture.componentRef.setInput('copyValue', '');
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('button'));
               expect(copyButton).toBeFalsy();
          });

          it('should show secondary copy button when secondaryCopyValue is provided', () => {
               fixture.componentRef.setInput('copyValue', 'primary');
               fixture.componentRef.setInput('secondaryCopyValue', 'secondary');
               fixture.detectChanges();

               const buttons = fixture.debugElement.queryAll(By.css('button'));
               expect(buttons.length).toBe(2);
          });

          it('should not show secondary copy button when secondaryCopyValue is empty', () => {
               fixture.componentRef.setInput('copyValue', 'primary');
               fixture.componentRef.setInput('secondaryCopyValue', '');
               fixture.detectChanges();

               const buttons = fixture.debugElement.queryAll(By.css('button'));
               expect(buttons.length).toBe(1);
          });

          it('should have correct tooltip for copy button', () => {
               fixture.componentRef.setInput('copyValue', 'test-id');
               fixture.componentRef.setInput('copyTooltip', 'Copy NFT ID');
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('button'));
               expect(copyButton.nativeElement.getAttribute('title')).toBe('Copy NFT ID');
          });

          it('should have correct tooltip for secondary copy button', () => {
               fixture.componentRef.setInput('copyValue', 'primary');
               fixture.componentRef.setInput('secondaryCopyValue', 'secondary');
               fixture.componentRef.setInput('secondaryCopyTooltip', 'Copy Secondary');
               fixture.detectChanges();

               const secondaryButton = fixture.debugElement.queryAll(By.css('button'))[1];
               expect(secondaryButton.nativeElement.getAttribute('title')).toBe('Copy Secondary');
          });
     });

     describe('Event handlers - onClick', () => {
          it('should emit onClick when li is clicked', () => {
               spyOn(component.onClick, 'emit');
               const liElement = fixture.debugElement.query(By.css('li'));
               liElement.triggerEventHandler('click', null);

               expect(component.onClick.emit).toHaveBeenCalled();
          });

          it('should trigger host component click handler', () => {
               hostComponent.clickCount = 0;
               const liElement = hostFixture.debugElement.query(By.css('li'));
               liElement.triggerEventHandler('click', null);

               expect(hostComponent.clickCount).toBe(1);
          });
     });

     describe('Event handlers - onCopy', () => {
          let copyButton: DebugElement;

          beforeEach(() => {
               fixture.componentRef.setInput('copyValue', 'test-value');
               fixture.detectChanges();
               copyButton = fixture.debugElement.query(By.css('button'));
          });

          it('should emit onCopyClick with copyValue when copy button is clicked', () => {
               spyOn(component.onCopyClick, 'emit');
               const mockEvent = new MouseEvent('click');
               copyButton.triggerEventHandler('click', mockEvent);

               expect(component.onCopyClick.emit).toHaveBeenCalledWith('test-value');
          });

          it('should stop propagation when copy button is clicked', () => {
               const mockEvent = new MouseEvent('click');
               spyOn(mockEvent, 'stopPropagation');
               copyButton.triggerEventHandler('click', mockEvent);

               expect(mockEvent.stopPropagation).toHaveBeenCalled();
          });

          it('should trigger host component copy handler', () => {
               hostComponent.copiedValue = '';
               hostFixture.componentInstance.copyValue = 'test-id';
               hostFixture.detectChanges();

               const hostCopyButton = hostFixture.debugElement.query(By.css('button'));
               hostCopyButton.triggerEventHandler('click', new MouseEvent('click'));

               expect(hostComponent.copiedValue).toBe('test-id');
          });
     });

     describe('Event handlers - onSecondaryCopy', () => {
          let secondaryButton: DebugElement;

          beforeEach(() => {
               fixture.componentRef.setInput('copyValue', 'primary');
               fixture.componentRef.setInput('secondaryCopyValue', 'secondary-test');
               fixture.detectChanges();
               const buttons = fixture.debugElement.queryAll(By.css('button'));
               secondaryButton = buttons[1];
          });

          it('should emit secondaryCopyClick with secondaryCopyValue when secondary copy button is clicked', () => {
               spyOn(component.secondaryCopyClick, 'emit');
               const mockEvent = new MouseEvent('click');
               secondaryButton.triggerEventHandler('click', mockEvent);

               expect(component.secondaryCopyClick.emit).toHaveBeenCalledWith('secondary-test');
          });

          it('should stop propagation when secondary copy button is clicked', () => {
               const mockEvent = new MouseEvent('click');
               spyOn(mockEvent, 'stopPropagation');
               secondaryButton.triggerEventHandler('click', mockEvent);

               expect(mockEvent.stopPropagation).toHaveBeenCalled();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty copyValue', () => {
               fixture.componentRef.setInput('copyValue', '');
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('button'));
               expect(copyButton).toBeFalsy();
          });

          it('should handle very long copy values', () => {
               const longValue = 'a'.repeat(1000);
               fixture.componentRef.setInput('copyValue', longValue);
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('button'));
               expect(copyButton).toBeTruthy();
          });

          it('should handle both selected and expired states together', () => {
               fixture.componentRef.setInput('selected', true);
               fixture.componentRef.setInput('isExpired', true);
               fixture.detectChanges();

               const liElement = fixture.debugElement.query(By.css('li'));
               expect(liElement.classes['bg-blue-50']).toBeTrue();
               expect(liElement.classes['border-blue-300']).toBeTrue();
               expect(liElement.classes['border-red-200']).toBeTrue();
          });
     });
});
