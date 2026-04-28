import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export interface FlagOption<K extends string = string> {
     key: K;
     label: string;
     hex: string;
     description: string;
}

@Component({
     selector: 'app-flag-selector',
     standalone: true,
     imports: [LucideAngularModule],
     templateUrl: './flag-selector.component.html',
})
export class FlagSelectorComponent<K extends string = string> {
     title = input.required<string>();

     flagsConfig = input.required<FlagOption<K>[]>();

     // Accept exact flag shape
     flags = input.required<Record<K, boolean>>();

     totalValue = input.required<number | string>();
     totalHex = input.required<string>();

     // Accept exact toggle function
     toggleFlag = input.required<(key: K) => void>();

     isFlagSet(key: K): boolean {
          return !!this.flags()?.[key];
     }
}
