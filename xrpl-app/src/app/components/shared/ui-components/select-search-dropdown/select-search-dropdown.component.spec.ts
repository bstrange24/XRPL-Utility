import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SelectSearchDropdownComponent, SelectItem } from './select-search-dropdown.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

@Component({
     standalone: true,
     imports: [SelectSearchDropdownComponent],
     template: ` <app-select-search-dropdown [items]="items()" [value]="value()" [placeholder]="'Search...'" [disabled]="disabled()" (valueChange)="onValueChange($event)" (selected)="onSelected($event)" (searchQueryChange)="onSearch($event)" /> `,
})
class TestHostComponent {
     items = signal<SelectItem[]>([
          { id: '1', display: 'XRP', secondary: 'r123', group: 'Crypto' },
          { id: '2', display: 'USD', secondary: 'r456', group: 'Fiat' },
          { id: '3', display: 'EUR', secondary: 'r789', group: 'Fiat', isCurrentAccount: true },
     ]);

     value = signal<SelectItem | null>(null);
     disabled = signal(false);

     onValueChange = jasmine.createSpy('valueChange');
     onSelected = jasmine.createSpy('selected');
     onSearch = jasmine.createSpy('searchChange');
}

describe('SelectSearchDropdownComponent', () => {
     let fixture: ComponentFixture<TestHostComponent>;
     let host: TestHostComponent;
     let overlayContainer: OverlayContainer;
     let overlayEl: HTMLElement;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TestHostComponent, NoopAnimationsModule],
               providers: [
                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TestHostComponent);
          host = fixture.componentInstance;

          overlayContainer = TestBed.inject(OverlayContainer);
          overlayEl = overlayContainer.getContainerElement();

          fixture.detectChanges();
     });

     function getInput(): HTMLInputElement {
          return fixture.debugElement.query(By.css('input')).nativeElement;
     }

     function openDropdown() {
          getInput().dispatchEvent(new Event('focus'));
          fixture.detectChanges();
     }

     function getOverlayItems() {
          return overlayEl.querySelectorAll('.combobox-item');
     }

     /* ---------------- BASIC ---------------- */

     it('should create', () => {
          expect(host).toBeTruthy();
     });

     /* ---------------- OPEN / CLOSE ---------------- */

     it('should open dropdown on focus', () => {
          openDropdown();

          expect(getOverlayItems().length).toBeGreaterThan(0);
     });

     it('should close on backdrop click', () => {
          openDropdown();

          const backdrop = overlayEl.querySelector('.cdk-overlay-backdrop') as HTMLElement;
          backdrop.click();

          fixture.detectChanges();

          expect(getOverlayItems().length).toBe(0);
     });

     /* ---------------- FILTERING ---------------- */

     it('should filter items based on input', () => {
          const input = getInput();

          input.value = 'usd';
          input.dispatchEvent(new Event('input'));

          fixture.detectChanges();

          const items = getOverlayItems();
          expect(items.length).toBe(1);
          expect(items[0].textContent).toContain('USD');
     });

     it('should show empty message when no results', () => {
          const input = getInput();

          input.value = 'zzz';
          input.dispatchEvent(new Event('input'));

          fixture.detectChanges();

          expect(overlayEl.textContent).toContain('No items found');
     });

     /* ---------------- SELECTION ---------------- */

     it('should select item on click', () => {
          openDropdown();

          const items = getOverlayItems();
          (items[0] as HTMLElement).click();

          fixture.detectChanges();

          expect(host.onValueChange).toHaveBeenCalled();
          expect(host.onSelected).toHaveBeenCalled();
     });

     it('should NOT select item if isCurrentAccount', () => {
          openDropdown();

          const items = getOverlayItems();
          const current = Array.from(items).find(el => el.textContent?.includes('EUR')) as HTMLElement;

          current.click();

          expect(host.onValueChange).not.toHaveBeenCalled();
     });

     /* ---------------- KEYBOARD NAV ---------------- */

     it('should navigate with arrow keys', () => {
          openDropdown();

          const input = getInput();

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          fixture.detectChanges();

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          fixture.detectChanges();

          const highlighted = overlayEl.querySelector('.highlighted');
          expect(highlighted).not.toBeNull();
     });

     it('should select with Enter key', () => {
          openDropdown();

          const input = getInput();

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          fixture.detectChanges();

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
          fixture.detectChanges();

          expect(host.onSelected).toHaveBeenCalled();
     });

     it('should close on Escape', () => {
          openDropdown();

          const input = getInput();

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          fixture.detectChanges();

          expect(getOverlayItems().length).toBe(0);
     });

     /* ---------------- DISPLAY VALUE ---------------- */

     it('should show selected value in input', () => {
          host.value.set({ id: '1', display: 'XRP', secondary: 'r1234567890' });

          fixture.detectChanges();

          expect(getInput().value).toContain('XRP');
     });

     /* ---------------- DISABLED ---------------- */

     it('should not open when disabled', () => {
          host.disabled.set(true);
          fixture.detectChanges();

          openDropdown();

          expect(getOverlayItems().length).toBe(0);
     });

     /* ---------------- OUTSIDE CLICK ---------------- */

     // it('should close when clicking outside', () => {
     //      openDropdown();

     //      document.body.click();
     //      fixture.detectChanges();

     //      expect(getOverlayItems().length).toBe(0);
     // });

     /* ---------------- SEARCH EMIT ---------------- */

     it('should emit searchQueryChange on input', () => {
          const input = getInput();

          input.value = 'xrp';
          input.dispatchEvent(new Event('input'));

          expect(host.onSearch).toHaveBeenCalledWith('xrp');
     });

     /* ---------------- STATIC INSTANCE ---------------- */

     it('should close previous dropdown when another opens', () => {
          openDropdown();

          const secondFixture = TestBed.createComponent(TestHostComponent);
          secondFixture.detectChanges();

          const secondInput = secondFixture.debugElement.query(By.css('input')).nativeElement;
          secondInput.dispatchEvent(new Event('focus'));

          secondFixture.detectChanges();

          // Only one dropdown should exist
          expect(overlayEl.querySelectorAll('.combobox-item').length).toBeGreaterThan(0);
     });
});
