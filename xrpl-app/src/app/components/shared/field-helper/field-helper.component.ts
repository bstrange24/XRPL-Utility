import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-field-helper',
     standalone: true,
     imports: [CommonModule, LucideAngularModule],
     templateUrl: './field-helper.component.html',
     styleUrl: './field-helper.component.css',
})
export class FieldHelperComponent {
     @Input() title = 'Help';
     @Input() items: string[] = [];
     @Input() show = signal(false);
}
