import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
     selector: '[app-focus-border]',
     standalone: true,
})
export class FocusBorderDirective {
     @Input() isValid = false;
     @Input() isInvalid = false;

     private focused = false;

     @HostBinding('class.border-gray-200')
     get gray() {
          return !this.focused && !this.isInvalid && !this.isValid;
     }

     @HostBinding('class.border-green-500')
     get green() {
          return this.focused && this.isValid;
     }

     @HostBinding('class.border-red-500')
     get red() {
          return this.isInvalid;
     }

     @HostListener('focus')
     onFocus() {
          this.focused = true;
     }

     @HostListener('blur')
     onBlur() {
          this.focused = false;
     }
}