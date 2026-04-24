import { Component, input } from '@angular/core';

@Component({
     selector: 'app-summary-key-value',
     standalone: true,
     imports: [],
     templateUrl: './summary-key-value.component.html',
     styleUrl: './summary-key-value.component.css',
})
export class SummaryKeyValueComponent {
     label = input.required<string>();
}
