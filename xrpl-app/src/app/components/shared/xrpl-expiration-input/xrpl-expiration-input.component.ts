// import { ChangeDetectionStrategy, Component, Input, Signal, computed, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy, signal, effect } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { XrplDateService } from '../../../core/xrpl-date.service';
// import flatpickr from 'flatpickr';
// import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';

// @Component({
//      selector: 'app-xrpl-expiration-input',
//      standalone: true,
//      imports: [CommonModule],
//      templateUrl: './xrpl-expiration-input.component.html',
//      styleUrl: './xrpl-expiration-input.component.css',
//      changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class XrplExpirationInputComponent implements AfterViewInit, OnDestroy {
//      private readonly xrplDateService = inject(XrplDateService);
//      private readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

//      @ViewChild('flatpickrInput', { static: false }) flatpickrInput!: ElementRef;

//      @Input({ required: true }) expirationSignal!: Signal<string>;
//      @Input({ required: true }) setExpiration!: (value: string) => void;
//      @Input() enableSignal!: Signal<boolean>;
//      @Input() setEnable!: (enabled: boolean) => void;
//      @Input() resetWhenOptionsDisabled = false;
//      @Input() optionsEnabledSignal?: Signal<boolean>;
//      @Input() showError = false;
//      @Input() errorMessage = '';

//      @Input() label = 'Expiration (optional)';
//      @Input() hint = '';

//      showPicker = false;
//      private picker: any = null;
//      enabled = signal(false);

//      constructor() {
//           // Sync store → component
//           effect(() => {
//                if (this.enableSignal) {
//                     this.enabled.set(this.enableSignal());
//                     this.xrplTxOptionsStore.setIsExpirationEnabled(this.enableSignal());
//                }
//           });

//           effect(() => {
//                const expiration = this.expirationSignal();
//                if (expiration && !this.enabled()) {
//                     // If there's an expiration value but enabled is false, sync it
//                     this.enabled.set(true);
//                     this.xrplTxOptionsStore.setIsExpirationEnabled(true);
//                     if (this.setEnable) {
//                          this.setEnable(true);
//                     }
//                }
//           });

//           // if (this.optionsEnabledSignal) {
//           //      effect(() => {
//           //           const optionsEnabled = this.optionsEnabledSignal()!;
//           //           if (this.resetWhenOptionsDisabled && !optionsEnabled) {
//           //                // Reset expiration when options are disabled
//           //                this.reset();
//           //                this.enabled.set(false);
//           //                this.xrplTxOptionsStore.setIsExpirationEnabled(false);
//           //                if (this.setEnable) {
//           //                     this.setEnable(false);
//           //                }
//           //           }
//           //      });
//           // }
//      }

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

//      ngAfterViewInit() {}

//      ngOnDestroy() {
//           if (this.picker) {
//                this.picker.destroy();
//                this.picker = null;
//           }

//           this.xrplTxOptionsStore.setIsExpirationEnabled(false);
//      }

//      togglePicker() {
//           this.showPicker = !this.showPicker;

//           if (this.showPicker) {
//                setTimeout(() => {
//                     this.initFlatpickr();
//                }, 100);
//           } else if (this.picker) {
//                this.picker.destroy();
//                this.picker = null;
//           }
//      }

//      private initFlatpickr() {
//           if (!this.flatpickrInput?.nativeElement) return;

//           const currentValue = this.expirationSignal();
//           let defaultDate = undefined;

//           if (currentValue) {
//                const parsed = new Date(currentValue);
//                if (!isNaN(parsed.getTime())) {
//                     defaultDate = parsed;
//                }
//           }

//           if (this.picker) {
//                this.picker.destroy();
//           }

//           this.picker = flatpickr(this.flatpickrInput.nativeElement, {
//                enableTime: true,
//                // enableSeconds: true,
//                dateFormat: 'Y-m-d\\TH:i:s',
//                time_24hr: true,
//                defaultDate: defaultDate,
//                allowInput: true,
//                clickOpens: true,
//                appendTo: document.body,
//                onChange: (selectedDates: Date[]) => {
//                     if (selectedDates && selectedDates.length > 0) {
//                          const formatted = this.formatDateTime(selectedDates[0]);
//                          this.setExpiration(formatted);
//                          this.xrplTxOptionsStore.setIsExpirationEnabled(true);
//                     }
//                },
//           });

//           if (defaultDate) {
//                this.picker.setDate(defaultDate, false);
//           }

//           // Ensure calendar starts closed
//           if (this.picker.isOpen) {
//                this.picker.close();
//           }
//      }

//      private formatDateTime(date: Date): string {
//           const year = date.getFullYear();
//           const month = String(date.getMonth() + 1).padStart(2, '0');
//           const day = String(date.getDate()).padStart(2, '0');
//           const hours = String(date.getHours()).padStart(2, '0');
//           const minutes = String(date.getMinutes()).padStart(2, '0');
//           const seconds = String(date.getSeconds()).padStart(2, '0');
//           return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
//      }

//      toggle(event: Event) {
//           const checked = (event.target as HTMLInputElement).checked;
//           this.enabled.set(checked);

//           this.xrplTxOptionsStore.setIsExpirationEnabled(checked);

//           if (this.setEnable) {
//                this.setEnable(checked);
//           }

//           if (!checked) {
//                this.setExpiration('');
//                this.xrplTxOptionsStore.setIsExpirationEnabled(false);
//           } else if (!this.expirationSignal()) {
//                this.setNow();
//           }
//      }

//      setNow() {
//           const now = new Date();
//           now.setMilliseconds(0);
//           const formatted = this.xrplDateService.formatDateTimeLocal(now);
//           this.setExpiration(formatted);

//           this.xrplTxOptionsStore.setIsExpirationEnabled(true);

//           if (this.picker) {
//                this.picker.setDate(now);
//           }
//      }

//      setFromNow(seconds: number) {
//           const date = new Date();
//           date.setSeconds(date.getSeconds() + seconds);
//           date.setMilliseconds(0);
//           const formatted = this.xrplDateService.formatDateTimeLocal(date);
//           this.setExpiration(formatted);

//           this.xrplTxOptionsStore.setIsExpirationEnabled(true);

//           if (this.picker) {
//                this.picker.setDate(date);
//           }
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
//           const formatted = this.xrplDateService.formatDateTimeLocal(date);
//           this.setExpiration(formatted);

//           this.xrplTxOptionsStore.setIsExpirationEnabled(true);

//           if (this.picker) {
//                this.picker.setDate(date);
//           }
//      }

//      clear() {
//           this.setExpiration('');

//           this.xrplTxOptionsStore.setIsExpirationEnabled(false);

//           if (this.picker) {
//                this.picker.clear();
//           }
//      }

//      openPicker() {
//           if (this.picker) {
//                this.picker.open();
//           }
//      }
// }

///
import { ChangeDetectionStrategy, Component, Input, Signal, computed, inject, AfterViewInit, ElementRef, ViewChild, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XrplDateService } from '../../../core/xrpl-date.service';
import flatpickr from 'flatpickr';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { NgIcon } from '@ng-icons/core';
import { RealTimeExpirationService } from '../../../services/shared/real-time-date-expiration-check/real-time-expiration.service';

@Component({
     selector: 'app-xrpl-expiration-input',
     standalone: true,
     imports: [CommonModule, NgIcon],
     templateUrl: './xrpl-expiration-input.component.html',
     styleUrl: './xrpl-expiration-input.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XrplExpirationInputComponent implements AfterViewInit, OnDestroy {
     private readonly xrplDateService = inject(XrplDateService);
     private readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly realTimeService = inject(RealTimeExpirationService);

     @ViewChild('flatpickrInput', { static: false }) flatpickrInput!: ElementRef;

     @Input({ required: true }) expirationSignal!: Signal<string>;
     @Input({ required: true }) setExpiration!: (value: string) => void;
     @Input() enableSignal!: Signal<boolean>;
     @Input() setEnable!: (enabled: boolean) => void;
     @Input() resetWhenOptionsDisabled = false;
     @Input() optionsEnabledSignal?: Signal<boolean>;
     @Input() showError = false;
     @Input() errorMessage = '';
     @Input() expirationType: 'finish' | 'cancel' | 'paymentChannel' | 'check' | 'credential' = 'cancel'; // NEW INPUT

     @Input() label = 'Expiration (optional)';
     @Input() hint = '';

     showPicker = false;
     private picker: any = null;
     enabled = signal(false);

     // Real-time time remaining display
     timeRemaining = signal('');
     timeRemainingSeconds = signal(0);
     isUrgent = signal(false);
     isCritical = signal(false);

     constructor() {
          effect(() => {
               if (this.enableSignal) {
                    this.enabled.set(this.enableSignal());
                    this.xrplTxOptionsStore.setIsExpirationEnabled(this.enableSignal());
               }
          });

          effect(() => {
               const expiration = this.expirationSignal();
               if (expiration && !this.enabled()) {
                    this.enabled.set(true);
                    this.xrplTxOptionsStore.setIsExpirationEnabled(true);
                    if (this.setEnable) {
                         this.setEnable(true);
                    }
               }
          });

          // Subscribe to real-time updates based on expiration type
          effect(() => {
               let secondsRemaining = 0;
               let timeRemainingText = '';

               switch (this.expirationType) {
                    case 'credential':
                         secondsRemaining = this.realTimeService.credentialSecondsRemaining();
                         timeRemainingText = this.realTimeService.credentialTimeRemaining();
                         break;
                    case 'finish':
                         secondsRemaining = this.realTimeService.escrowFinishAfterSecondsRemaining();
                         timeRemainingText = this.realTimeService.escrowFinishAfterTimeRemaining();
                         break;
                    case 'cancel':
                         secondsRemaining = this.realTimeService.escrowCancelAfterSecondsRemaining();
                         timeRemainingText = this.realTimeService.escrowCancelAfterTimeRemaining();
                         break;
                    case 'paymentChannel':
                         secondsRemaining = this.realTimeService.paymentChannelSecondsRemaining();
                         timeRemainingText = this.realTimeService.paymentChannelTimeRemaining();
                         break;
                    default:
                         secondsRemaining = this.realTimeService.escrowCancelAfterSecondsRemaining();
                         timeRemainingText = this.realTimeService.escrowCancelAfterTimeRemaining();
               }

               this.timeRemainingSeconds.set(secondsRemaining);
               this.timeRemaining.set(timeRemainingText);

               // Update urgency flags
               this.isUrgent.set(secondsRemaining > 0 && secondsRemaining <= 20);
               this.isCritical.set(secondsRemaining > 0 && secondsRemaining <= 5);
          });
     }

     formatted = computed(() => {
          const val = this.expirationSignal();
          if (!val) return '';
          return new Date(val).toLocaleString();
     });

     relative = computed(() => {
          const timeRemaining = this.timeRemaining();
          if (timeRemaining === 'Expired') return 'expired';
          if (timeRemaining) return timeRemaining;
          return '';
     });

     getCountdownDisplay(): string {
          const seconds = this.timeRemainingSeconds();

          if (seconds <= 0) return '';

          // For less than 60 seconds, show just seconds
          if (seconds < 60) {
               return `${seconds}s`;
          }

          // For minutes and seconds
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;

          if (minutes < 60) {
               if (remainingSeconds > 0) {
                    return `${minutes}m ${remainingSeconds}s`;
               }
               return `${minutes}m`;
          }

          // For hours and minutes
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;

          if (hours < 24) {
               if (remainingMinutes > 0) {
                    return `${hours}h ${remainingMinutes}m`;
               }
               return `${hours}h`;
          }

          return this.timeRemaining();
     }

     getUrgencyClass(): string {
          if (this.isCritical()) {
               return 'countdown-critical';
          }
          if (this.isUrgent()) {
               return 'countdown-urgent';
          }
          return '';
     }

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
                         this.xrplTxOptionsStore.setIsExpirationEnabled(true);
                         this.realTimeService.forceCheck();
                    }
               },
          });

          if (defaultDate) {
               this.picker.setDate(defaultDate, false);
          }

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

          this.xrplTxOptionsStore.setIsExpirationEnabled(checked);

          if (this.setEnable) {
               this.setEnable(checked);
          }

          if (!checked) {
               this.setExpiration('');
               this.xrplTxOptionsStore.setIsExpirationEnabled(false);
          } else if (!this.expirationSignal()) {
               this.setNow();
          }

          this.realTimeService.forceCheck();
     }

     setNow() {
          const now = new Date();
          now.setMilliseconds(0);
          const formatted = this.xrplDateService.formatDateTimeLocal(now);
          this.setExpiration(formatted);

          this.xrplTxOptionsStore.setIsExpirationEnabled(true);

          if (this.picker) {
               this.picker.setDate(now);
          }

          setTimeout(() => this.realTimeService.forceCheck(), 100);
     }

     setFromNow(seconds: number) {
          const date = new Date();
          date.setSeconds(date.getSeconds() + seconds);
          date.setMilliseconds(0);
          const formatted = this.xrplDateService.formatDateTimeLocal(date);
          this.setExpiration(formatted);

          this.xrplTxOptionsStore.setIsExpirationEnabled(true);

          if (this.picker) {
               this.picker.setDate(date);
          }

          setTimeout(() => this.realTimeService.forceCheck(), 100);
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

          this.xrplTxOptionsStore.setIsExpirationEnabled(true);

          if (this.picker) {
               this.picker.setDate(date);
          }

          setTimeout(() => this.realTimeService.forceCheck(), 100);
     }

     clear() {
          this.setExpiration('');
          this.xrplTxOptionsStore.setIsExpirationEnabled(false);
          this.enabled.set(false);

          if (this.setEnable) {
               this.setEnable(false);
          }

          if (this.picker) {
               this.picker.clear();
          }

          this.realTimeService.forceCheck();
     }

     openPicker() {
          if (this.picker) {
               this.picker.open();
          }
     }
}
