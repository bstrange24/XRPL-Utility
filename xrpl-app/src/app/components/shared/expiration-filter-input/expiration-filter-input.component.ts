import { ChangeDetectionStrategy, Component, ElementRef, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import flatpickr from 'flatpickr';

@Component({
     selector: 'app-expiration-filter-input',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule],
     templateUrl: './expiration-filter-input.component.html',
     styleUrl: './expiration-filter-input.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpirationFilterInputComponent {
     private picker: any = null;

     @ViewChild('flatpickrInput') flatpickrInput!: ElementRef;

     label = input<string>('Expires After');
     value = input.required<string | null>();
     valueChange = output<string | null>();

     onChange(value: string | null) {
          this.valueChange.emit(value);
     }

     clear() {
          this.valueChange.emit(null);
          if (this.picker) this.picker.clear();
     }

     ngAfterViewInit() {
          setTimeout(() => this.initFlatpickr(), 50);
     }

     ngOnDestroy() {
          if (this.picker) {
               this.picker.destroy();
               this.picker = null;
          }
     }

     private initFlatpickr() {
          if (!this.flatpickrInput?.nativeElement) return;

          this.picker = flatpickr(this.flatpickrInput.nativeElement, {
               enableTime: false,
               dateFormat: 'Y-m-d',
               allowInput: true,
               clickOpens: true,
               defaultDate: this.value() || undefined,
               onChange: (selectedDates: Date[]) => {
                    if (selectedDates.length > 0) {
                         const formatted = selectedDates[0].toISOString().split('T')[0]; // YYYY-MM-DD
                         this.valueChange.emit(formatted);
                    } else {
                         this.valueChange.emit(null);
                    }
               },
          });
     }
}
