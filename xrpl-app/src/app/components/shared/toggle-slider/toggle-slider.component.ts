import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
     selector: 'app-toggle-slider',
     imports: [],
     templateUrl: './toggle-slider.component.html',
     styleUrl: './toggle-slider.component.css',
})
export class ToggleSliderComponent {
     @Input() checked = false;
     @Output() checkedChange = new EventEmitter<boolean>();

     onChange(event: Event) {
          const target = event.target as HTMLInputElement;
          this.checkedChange.emit(target.checked);
     }
}
