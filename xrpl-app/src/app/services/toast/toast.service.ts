import { Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface Toast {
     id: number;
     message: string | SafeHtml;
     type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
     private id = 0;
     toasts = signal<Toast[]>([]);
     private readonly isShowing = signal<boolean>(false);

     constructor(private readonly sanitizer: DomSanitizer) {}

     success(message: string, duration = 4000, makeHashLink = false, hash?: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;

          if (makeHashLink && hash) {
               const link = `${explorerBaseUrl}${hash}`;
               const html = `${message}\nView Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success' }, duration);
     }

     successMultipleHashesWithTickets(message: string, duration = 4000, results: { ticketSeq: string; hash: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
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

          this.show({ message: finalMessage, type: 'success' }, duration);
     }

     error(message: string, duration = 4000, makeHashLink = false, hash?: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;

          if (makeHashLink && hash) {
               const link = `${explorerBaseUrl}${hash}`;
               const html = `${message}View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message, type: 'error' }, duration);
     }

     info(message: string, duration = 2000) {
          this.show({ message, type: 'info' }, duration);
     }

     public show(toast: Omit<Toast, 'id'>, duration: number) {
          const id = ++this.id;
          this.toasts.update(t => [...t, { ...toast, id }]);

          setTimeout(() => {
               this.toasts.update(t => t.filter(x => x.id !== id));
          }, duration);
     }

     clear() {
          this.toasts.set([]);
     }

     removeToast(id: number) {
          // Trigger leave animation first, then remove after it finishes
          setTimeout(() => {
               this.toasts.update(toasts => toasts.filter(t => t.id !== id));
          }, 200);
     }
}
