import { ChangeDetectionStrategy, Component, Input, Signal, computed, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XrplDateService } from '../../../core/xrpl-date.service';
import flatpickr from 'flatpickr';

@Component({
     selector: 'app-xrpl-expiration-input',
     standalone: true,
     imports: [CommonModule],
     templateUrl: './xrpl-expiration-input.component.html',
     styleUrl: './xrpl-expiration-input.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XrplExpirationInputComponent implements AfterViewInit, OnDestroy {
     private readonly xrplDateService = inject(XrplDateService);

     @ViewChild('flatpickrInput', { static: false }) flatpickrInput!: ElementRef;

     @Input({ required: true }) expirationSignal!: Signal<string>;
     @Input({ required: true }) setExpiration!: (value: string) => void;
     @Input() enableSignal!: Signal<boolean>;
     @Input() setEnable!: (enabled: boolean) => void;

     @Input() label = 'Expiration (optional)';
     @Input() hint = '';

     showPicker = false;
     private picker: any = null;
     enabled = signal(false);

     constructor() {
          // Sync store → component
          effect(() => {
               if (this.enableSignal) {
                    this.enabled.set(this.enableSignal());
               }
          });
     }

     formatted = computed(() => {
          const val = this.expirationSignal();
          if (!val) return '';
          return new Date(val).toLocaleString();
     });

     relative = computed(() => {
          const val = this.expirationSignal();
          if (!val) return '';

          const now = Date.now();
          const target = new Date(val).getTime();
          const diff = Math.floor((target - now) / 1000);

          if (diff <= 0) return 'expired';

          const units = [
               { s: 86400, label: 'd' },
               { s: 3600, label: 'h' },
               { s: 60, label: 'm' },
               { s: 1, label: 's' },
          ];

          for (const u of units) {
               const v = Math.floor(diff / u.s);
               if (v > 0) return `in ${v}${u.label}`;
          }

          return '';
     });

     ngAfterViewInit() {}

     ngOnDestroy() {
          if (this.picker) {
               this.picker.destroy();
               this.picker = null;
          }
     }

     togglePicker() {
          this.showPicker = !this.showPicker;

          if (this.showPicker) {
               setTimeout(() => {
                    this.initFlatpickr();
               }, 100);
          } else if (this.picker) {
               this.picker.destroy();
               this.picker = null;
          }
     }

     private initFlatpickr() {
          if (!this.flatpickrInput?.nativeElement) return;

          const currentValue = this.expirationSignal();
          let defaultDate = undefined;

          if (currentValue) {
               const parsed = new Date(currentValue);
               if (!isNaN(parsed.getTime())) {
                    defaultDate = parsed;
               }
          }

          if (this.picker) {
               this.picker.destroy();
          }

          this.picker = flatpickr(this.flatpickrInput.nativeElement, {
               enableTime: true,
               // enableSeconds: true,
               dateFormat: 'Y-m-d\\TH:i:s',
               time_24hr: true,
               defaultDate: defaultDate,
               allowInput: true,
               clickOpens: true,
               appendTo: document.body,
               onChange: (selectedDates: Date[]) => {
                    if (selectedDates && selectedDates.length > 0) {
                         const formatted = this.formatDateTime(selectedDates[0]);
                         this.setExpiration(formatted);
                    }
               },
          });

          if (defaultDate) {
               this.picker.setDate(defaultDate, false);
          }

          // Ensure calendar starts closed
          if (this.picker.isOpen) {
               this.picker.close();
          }
     }

     private formatDateTime(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
     }

     toggle(event: Event) {
          const checked = (event.target as HTMLInputElement).checked;
          this.enabled.set(checked);

          if (this.setEnable) {
               this.setEnable(checked);
          }

          if (!checked) {
               this.setExpiration('');
          } else if (!this.expirationSignal()) {
               this.setNow();
          }
     }

     toggle1(event: Event) {
          const checked = (event.target as HTMLInputElement).checked;
          this.enabled.set(checked);

          if (!checked) {
               this.setExpiration('');
          } else if (!this.expirationSignal()) {
               this.setNow();
          }
     }

     setNow() {
          const now = new Date();
          now.setMilliseconds(0);
          const formatted = this.xrplDateService.formatDateTimeLocal(now);
          this.setExpiration(formatted);
          if (this.picker) {
               this.picker.setDate(now);
          }
     }

     setFromNow(seconds: number) {
          const date = new Date();
          date.setSeconds(date.getSeconds() + seconds);
          date.setMilliseconds(0);
          const formatted = this.xrplDateService.formatDateTimeLocal(date);
          this.setExpiration(formatted);
          if (this.picker) {
               this.picker.setDate(date);
          }
     }

     addSeconds(sec: number) {
          let current = this.expirationSignal();
          if (!current) {
               this.setFromNow(sec);
               return;
          }
          const date = new Date(current);
          date.setSeconds(date.getSeconds() + sec);
          date.setMilliseconds(0);
          const formatted = this.xrplDateService.formatDateTimeLocal(date);
          this.setExpiration(formatted);
          if (this.picker) {
               this.picker.setDate(date);
          }
     }

     clear() {
          this.setExpiration('');

          if (this.picker) {
               this.picker.clear();
          }
     }

     openPicker() {
          if (this.picker) {
               this.picker.open();
          }
     }
}

/////////////// Works Latest
// import { ChangeDetectionStrategy, Component, Input, Signal, computed, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { XrplDateService } from '../../../core/xrpl-date.service';

// @Component({
//      selector: 'app-xrpl-expiration-input',
//      standalone: true,
//      imports: [CommonModule],
//      templateUrl: './xrpl-expiration-input.component.html',
//      styleUrl: './xrpl-expiration-input.component.css',
//      changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class XrplExpirationInputComponent {
//      private readonly xrplDateService = inject(XrplDateService);

//      @Input({ required: true }) expirationSignal!: Signal<string>;
//      @Input({ required: true }) setExpiration!: (value: string) => void;

//      @Input() label = 'Expiration (optional)';
//      @Input() hint = '';

//      showPicker = false;

//      enabled = computed(() => !!this.expirationSignal());

//      formatted = computed(() => {
//           const val = this.expirationSignal();
//           if (!val) return '';
//           return new Date(val).toLocaleString();
//      });

//      relative = computed(() => {
//           const val = this.expirationSignal();
//           if (!val) return '';

//           const now = Date.now();
//           const target = new Date(val).getTime();
//           const diff = Math.floor((target - now) / 1000);

//           if (diff <= 0) return 'expired';

//           const units = [
//                { s: 86400, label: 'd' },
//                { s: 3600, label: 'h' },
//                { s: 60, label: 'm' },
//                { s: 1, label: 's' },
//           ];

//           for (const u of units) {
//                const v = Math.floor(diff / u.s);
//                if (v > 0) return `in ${v}${u.label}`;
//           }

//           return '';
//      });

//      toggle(event: Event) {
//           const checked = (event.target as HTMLInputElement).checked;
//           if (!checked) {
//                this.setExpiration('');
//           } else {
//                this.setNow();
//           }
//      }

//      onInput(event: Event) {
//           const value = (event.target as HTMLInputElement).value;
//           this.setExpiration(value);
//      }

//      setNow() {
//           const now = new Date();
//           now.setMilliseconds(0);
//           this.setExpiration(this.xrplDateService.formatDateTimeLocal(now));
//      }

//      setFromNow(seconds: number) {
//           const date = new Date();
//           date.setSeconds(date.getSeconds() + seconds);
//           date.setMilliseconds(0);
//           this.setExpiration(this.xrplDateService.formatDateTimeLocal(date));
//      }

//      addSeconds(sec: number) {
//           let current = this.expirationSignal();

//           if (!current) {
//                this.setFromNow(sec);
//                return;
//           }

//           const date = new Date(current);
//           date.setSeconds(date.getSeconds() + sec);
//           date.setMilliseconds(0);

//           this.setExpiration(this.xrplDateService.formatDateTimeLocal(date));
//      }

//      clear() {
//           this.setExpiration('');
//      }
// }

///////////////// OG
// export class XrplExpirationInputComponent {

// private readonly xrplDateService = inject(XrplDateService);

// @Input({ required: true }) expirationSignal!: Signal<string>;
// @Input({ required: true }) setExpiration!: (value: string) => void;

// @Input() label = 'Expiration (optional)';
// // @Input() hint = 'Leave blank for no expiration';
// @Input() hint = '';

// onInput(event: Event) {
//      const value = (event.target as HTMLInputElement).value;
//      this.setExpiration(value);
// }

// setNow() {
//      const now = new Date();
//      this.setExpiration(this.xrplDateService.formatDateTimeLocal(now));
// }

// addSeconds(sec: number) {
//      let current = this.expirationSignal();

//      if (!current) {
//           current = this.xrplDateService.formatDateTimeLocal(new Date());
//      }

//      const date = new Date(current);
//      date.setSeconds(date.getSeconds() + sec);

//      this.setExpiration(this.xrplDateService.formatDateTimeLocal(date));
// }

// clear() {
//      this.setExpiration('');
// }
// }
