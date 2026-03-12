import { Component, Input, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XrplDateService } from '../../../core/xrpl-date.service';

@Component({
     selector: 'app-xrpl-expiration-input',
     standalone: true,
     imports: [CommonModule],
     templateUrl: './xrpl-expiration-input.component.html',
     styleUrl: './xrpl-expiration-input.component.css',
})
export class XrplExpirationInputComponent {
     private readonly xrplDateService = inject(XrplDateService);

     @Input({ required: true }) expirationSignal!: Signal<string>;
     @Input({ required: true }) setExpiration!: (value: string) => void;

     @Input() label = 'Expiration (optional)';
     // @Input() hint = 'Leave blank for no expiration';
     @Input() hint = '';

     onInput(event: Event) {
          const value = (event.target as HTMLInputElement).value;
          this.setExpiration(value);
     }

     setNow() {
          const now = new Date();
          this.setExpiration(this.xrplDateService.formatDateTimeLocal(now));
     }

     addSeconds(sec: number) {
          let current = this.expirationSignal();

          if (!current) {
               current = this.xrplDateService.formatDateTimeLocal(new Date());
          }

          const date = new Date(current);
          date.setSeconds(date.getSeconds() + sec);

          this.setExpiration(this.xrplDateService.formatDateTimeLocal(date));
     }

     clear() {
          this.setExpiration('');
     }
}
