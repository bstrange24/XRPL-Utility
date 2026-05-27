import { Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-input-icons',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './input-icons.component.html',
     styleUrl: './input-icons.component.css',
})
export class InputIconsComponent {
     // Inputs
     isValid = input(false);
     isInvalid = input(false);
     showClear = input(false);

     // Outputs
     clear = output<void>();

     showValidation = computed(() => this.isValid() || this.isInvalid());
}
