import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-validation-errors',
     imports: [NgIcon],
     templateUrl: './validation-errors.component.html',
     styleUrl: './validation-errors.component.css',
})
export class ValidationErrorsComponent {
     errors = input<string[]>([]);
     title = input('Please fix the following issues:');
}
