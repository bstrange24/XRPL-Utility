import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
     selector: '[app-focus-border]',
     standalone: true,
})
export class FocusBorderDirective {
     @Input() isValid = false;
     @Input() isInvalid = false;

     private isFocused = false;

     // Default gray border
     @HostBinding('class.border-gray-200')
     get neutral() {
          return !this.isFocused && !this.isValid && !this.isInvalid;
     }

     // Focus ring ONLY when focused and NOT invalid
     @HostBinding('class.ring-2')
     get showRing() {
          return this.isFocused && !this.isInvalid;
     }

     @HostBinding('class.ring-green-300')
     get ringColor() {
          return this.isFocused && !this.isInvalid;
     }

     @HostBinding('class.border-green-500')
     get focusBorder() {
          return this.isFocused && !this.isInvalid;
     }

     // Green border when valid
     // @HostBinding('class.border-green-500')
     // get validBorder() {
     //      return this.isValid && !this.isInvalid;
     // }

     // Red border overrides everything
     @HostBinding('class.border-red-500')
     get invalidBorder() {
          return this.isInvalid;
     }

     @HostListener('focus')
     onFocus() {
          this.isFocused = true;
     }

     @HostListener('blur')
     onBlur() {
          this.isFocused = false;
     }
}
// import { Directive, HostBinding, HostListener, Input } from '@angular/core';

// @Directive({
//      selector: '[app-focus-border]',
//      standalone: true,
// })
// export class FocusBorderDirective {
//      @Input() isValid = false;
//      @Input() isInvalid = false;

//      private focused = false;

//      @HostBinding('class.border-gray-200')
//      get gray() {
//           return !this.focused && !this.isInvalid && !this.isValid;
//      }

//      @HostBinding('class.border-green-500')
//      get green() {
//           return this.focused && this.isValid;
//      }

//      @HostBinding('class.border-red-500')
//      get red() {
//           return this.isInvalid;
//      }

//      @HostListener('focus')
//      onFocus() {
//           this.focused = true;
//      }

//      @HostListener('blur')
//      onBlur() {
//           this.focused = false;
//      }
// }
