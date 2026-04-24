// summary-item.component.ts
import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-summary-item',
     standalone: true,
     imports: [LucideAngularModule],
     templateUrl: './summary-item.component.html',
     styleUrl: './summary-item.component.css',
})
export class SummaryItemComponent {
     selected = input<boolean>(false);
     copyValue = input<string>('');
     copyTooltip = input<string>('Copy to clipboard');

     secondaryCopyValue = input<string>('');
     secondaryCopyTooltip = input<string>('Copy to clipboard');
     secondaryCopyClick = output<string>();

     isExpired = input<boolean>(false);
     onClick = output<void>();
     onCopyClick = output<string>();

     onCopy(event: Event) {
          event.stopPropagation();
          this.onCopyClick.emit(this.copyValue());
     }

     onSecondaryCopy(event: Event) {
          event.stopPropagation();
          this.secondaryCopyClick.emit(this.secondaryCopyValue());
     }
}
