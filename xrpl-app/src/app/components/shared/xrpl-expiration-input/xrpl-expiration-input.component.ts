import { Component, Input, Signal, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilsService } from '../../../services/util-service/utils.service';

@Component({
     selector: 'app-xrpl-expiration-input',
     standalone: true,
     imports: [CommonModule],
     templateUrl: './xrpl-expiration-input.component.html',
     styleUrl: './xrpl-expiration-input.component.css',
})
export class XrplExpirationInputComponent {
     private readonly utilsService = inject(UtilsService);

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
          this.setExpiration(this.utilsService.formatDateTimeLocal(now));
     }

     addSeconds(sec: number) {
          let current = this.expirationSignal();

          if (!current) {
               current = this.utilsService.formatDateTimeLocal(new Date());
          }

          const date = new Date(current);
          date.setSeconds(date.getSeconds() + sec);

          this.setExpiration(this.utilsService.formatDateTimeLocal(date));
     }

     clear() {
          this.setExpiration('');
     }
}
