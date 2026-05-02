import { inject, Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppConstants } from '../../../core/app.constants';

type ToastMode = 'stack' | 'replace' | 'single';

export interface Toast {
     id: number;
     message: string | SafeHtml;
     type: 'success' | 'error' | 'info' | 'warn';
     duration: number;
     progress?: number;
     remaining?: number;
     timer?: ReturnType<typeof setTimeout>; // Store the timer reference
     interval?: ReturnType<typeof setInterval>; // Store interval for progress updates
}

@Injectable({ providedIn: 'root' })
export class ToastService {
     private readonly sanitizer = inject(DomSanitizer);
     private readonly id = 0;
     private idCounter = 0;
     public toasts = signal<Toast[]>([]);
     private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
     private readonly intervals = new Map<number, ReturnType<typeof setInterval>>();
     private readonly pausedToasts = new Map<number, { remaining: number; progress: number }>(); // Store remaining time when paused

     constructor() {}

     success(message: string, duration = 4000, makeHashLink = false, hash?: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;

          if (makeHashLink && hash) {
               const link = `${explorerBaseUrl}${hash}`;
               const html = `${message}<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success', duration }, duration);
     }

     successMultipleHashesWithTickets(message: string, results: { ticketSeq: string; hash: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/', duration = 4000) {
          let finalMessage: string | SafeHtml = message;

          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Ticket <code>${r.ticketSeq}</code> → <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');

               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success', duration }, duration);
     }

     successMultipleHashesWithDepositAuth(message: string, results: { depostiAuthAddress: any; hash: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/', duration = 4000) {
          let finalMessage: string | SafeHtml = message;

          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');

               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success', duration }, duration);
     }

     successMultipleHashes(message: string, duration: number, results: { hash: string; label: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;
          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Account Flag '${r.label}' updated successfully<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');
               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'success', duration }, duration);
     }

     errorMultipleHashes(message: string, duration: number, results: { hash: string | undefined; label: string; error: string | undefined }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;
          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Account Flag '${r.label}' update failed ${r.error}<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');
               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'error', duration }, duration);
     }

     buildMultiErrorMessage(failedResults: { address: string; hash?: string; error: string }[], txMessage: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/', duration = 4000) {
          let finalMessage: string | SafeHtml = '';

          const count = failedResults.length;
          const pluralS = count === 1 ? '' : 's';
          const affectedAddresses = failedResults.map(f => `${f.address}`).join('\n');
          let html = `${count} ${txMessage}${pluralS} failed.<br>Affected Address:\n${affectedAddresses}`;

          failedResults.forEach((fail, index) => {
               const explorerLink = fail.hash ? `View Tx in Explorer: <a href="${explorerBaseUrl}${fail.hash}" target="_blank"  rel="noopener noreferrer" class="underline hover:text-blue-200">${fail.hash}</a>` : '(no transaction hash available)';
               html += `${fail.error || 'Unknown error'}<br>${explorerLink}`;
          });
          finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          this.show({ message: finalMessage, type: 'error', duration }, AppConstants.TOAST.ERROR);
     }

     error(message: string, duration = 4000, makeHashLink = false, hash?: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;

          if (makeHashLink && hash) {
               const link = `${explorerBaseUrl}${hash}`;
               const html = `${message}<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'error', duration }, duration);
     }

     info(message: string, duration = 2000) {
          this.show({ message, type: 'info', duration }, duration);
     }

     warn(message: string, duration = 2000) {
          this.show({ message, type: 'warn', duration }, duration);
     }

     public show(toastInput: Omit<Toast, 'id' | 'progress' | 'remaining'>, customDuration?: number) {
          const duration = customDuration ?? toastInput.duration ?? 4000;
          const id = ++this.idCounter;

          const toast: Toast = {
               ...toastInput,
               id,
               duration,
               progress: 100,
               remaining: duration,
          };

          this.toasts.update(t => [...t, toast]);

          // Start the timer and progress animation
          this.startTimer(id, duration);
     }

     private startTimer(id: number, duration: number) {
          let remaining = duration;
          let startTime = Date.now();

          // Set up the interval to update progress
          const interval = setInterval(() => {
               const toast = this.toasts().find(t => t.id === id);
               if (toast) {
                    const isPaused = this.pausedToasts.has(id);
                    if (!isPaused) {
                         const elapsed = Date.now() - startTime;
                         remaining = Math.max(0, duration - elapsed);
                         const progress = (remaining / duration) * 100;

                         this.toasts.update(toasts => toasts.map(t => (t.id === id ? { ...t, progress, remaining } : t)));

                         // Clear everything when done
                         if (remaining <= 0) {
                              this.removeToast(id);
                         }
                    }
               }
          }, 16); // Update roughly every frame (60fps)

          this.intervals.set(id, interval);

          // Also set a timeout as a backup
          const timer = setTimeout(() => {
               this.removeToast(id);
          }, duration);

          this.timers.set(id, timer);
     }

     pauseTimer(id: number) {
          const toast = this.toasts().find(t => t.id === id);
          if (toast && !this.pausedToasts.has(id)) {
               // Store the current remaining time (ensure it has a value)
               const remaining = toast.remaining ?? toast.duration;
               const progress = toast.progress ?? 100;

               this.pausedToasts.set(id, { remaining, progress });

               // Clear existing timers
               const timer = this.timers.get(id);
               if (timer) {
                    clearTimeout(timer);
                    this.timers.delete(id);
               }

               const interval = this.intervals.get(id);
               if (interval) {
                    clearInterval(interval);
                    this.intervals.delete(id);
               }
          }
     }

     resumeTimer(id: number) {
          const paused = this.pausedToasts.get(id);
          if (paused) {
               this.pausedToasts.delete(id);
               this.startTimer(id, paused.remaining);
          }
     }

     removeToast(id: number) {
          // Clear all timers and intervals
          const timer = this.timers.get(id);
          if (timer) {
               clearTimeout(timer);
               this.timers.delete(id);
          }

          const interval = this.intervals.get(id);
          if (interval) {
               clearInterval(interval);
               this.intervals.delete(id);
          }

          this.pausedToasts.delete(id);

          // Remove the toast from the array
          this.toasts.update(toasts => toasts.filter(t => t.id !== id));
     }

     clear() {
          this.timers.forEach(t => clearTimeout(t));
          this.timers.clear();
          this.intervals.forEach(i => clearInterval(i));
          this.intervals.clear();
          this.pausedToasts.clear();
          this.toasts.set([]);
     }
}
