import { Component, input, output } from '@angular/core';

@Component({
     selector: 'app-did-delete',
     standalone: true,
     imports: [],
     templateUrl: './did-delete.component.html',
     styleUrl: './did-delete.component.css',
})
export class DidDeleteComponent {
     view = input.required<any>();
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();
}
