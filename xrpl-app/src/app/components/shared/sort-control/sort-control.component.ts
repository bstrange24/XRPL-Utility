import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

export interface SortOption {
     key: string;
     label: string;
}

export interface SortChangeEvent {
     key: string;
     direction: 'asc' | 'desc';
}

@Component({
     selector: 'app-sort-control',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './sort-control.component.html',
     styleUrl: './sort-control.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortControlComponent {
     options = input.required<SortOption[]>();
     sortKey = input.required<string>();
     direction = input.required<'asc' | 'desc'>();

     sortChange = output<SortChangeEvent>(); // Use typed event

     onSortKeyChange(event: Event) {
          const select = event.target as HTMLSelectElement;
          this.sortChange.emit({
               key: select.value,
               direction: this.direction(),
          });
     }

     toggleDirection() {
          this.sortChange.emit({
               key: this.sortKey(),
               direction: this.direction() === 'asc' ? 'desc' : 'asc',
          });
     }
}
