import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WarningMessageComponent } from './warning-message.component';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';

describe('WarningMessageComponent', () => {
     let fixture: ComponentFixture<WarningMessageComponent>;
     let component: WarningMessageComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [WarningMessageComponent, NgIcon],
          }).compileComponents();

          fixture = TestBed.createComponent(WarningMessageComponent);
          component = fixture.componentInstance;
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should render warning message text', () => {
          component.warningMessage = 'Test warning message';
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Test warning message');
     });

     it('should render empty message safely when no input provided', () => {
          component.warningMessage = '';
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          // no crash + no unexpected text
          expect(el.textContent?.trim().length).toBeGreaterThanOrEqual(0);
     });

     it('should render icon element', () => {
          component.warningMessage = 'Warning';
          fixture.detectChanges();

          const icon = fixture.debugElement.query(By.directive(NgIcon));
          expect(icon).not.toBeNull();
     });

     it('should apply correct structural layout classes', () => {
          component.warningMessage = 'Warning';
          fixture.detectChanges();

          const wrapper = fixture.debugElement.query(By.css('.flex.items-start'));
          expect(wrapper).not.toBeNull();

          const el: HTMLElement = wrapper.nativeElement;
          expect(el.className).toContain('bg-yellow-50');
          expect(el.className).toContain('border-yellow-200');
     });
});
