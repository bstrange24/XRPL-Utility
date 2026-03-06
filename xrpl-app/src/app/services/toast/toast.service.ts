import { Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppConstants } from '../../core/app.constants';

type ToastMode = 'stack' | 'replace' | 'single';

export interface Toast {
     id: number;
     message: string | SafeHtml;
     type: 'success' | 'error' | 'info' | 'warn';
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
               const html = `${message}<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success' }, duration);
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

          this.show({ message: finalMessage, type: 'success' }, duration);
     }

     successMultipleHashesWithDepositAuth(message: string, results: { depostiAuthAddress: any; hash: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/', duration = 4000) {
          let finalMessage: string | SafeHtml = message;

          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Deposit Auth <code>${r.depostiAuthAddress.SignerEntry.Account}</code><br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');

               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }

          this.show({ message: finalMessage, type: 'success' }, duration);
     }

     successMultipleHashes(message: string, duration: number, results: { hash: string; label: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;
          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Account Flag updated successfully<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');
               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'success' }, duration);
     }

     errorMultipleHashes(message: string, duration: number, results: { hash: string | undefined; label: string }[], explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;
          if (results && results.length > 0) {
               const linksHtml = results
                    .map(r => {
                         const link = `${explorerBaseUrl}${r.hash}`;
                         return `Account Flag update failed<br>View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${r.hash}</a>`;
                    })
                    .join('<br>');
               const html = `${message}<br>${linksHtml}`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'error' }, duration);
     }

     buildMultiErrorMessage(failedResults: { address: string; hash?: string; error: string }[], txMessage: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = '';

          const count = failedResults.length;
          const pluralS = count === 1 ? '' : 's';
          const affectedAddresses = failedResults.map(f => `${f.address}`).join('\n');
          let html = `${count} ${txMessage}${pluralS} failed.<br><br>Affected Address:\n${affectedAddresses}<br>`;

          failedResults.forEach((fail, index) => {
               const explorerLink = fail.hash ? `<br>View Tx in Explorer: <a href="${explorerBaseUrl}${fail.hash}" target="_blank"  rel="noopener noreferrer" class="underline hover:text-blue-200">${fail.hash}</a>` : '(no transaction hash available)';
               html += `${fail.error || 'Unknown error'}<br>${explorerLink}`;
          });
          finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          this.show({ message: finalMessage, type: 'error' }, AppConstants.TOAST.ERROR);
     }

     error(message: string, duration = 4000, makeHashLink = false, hash?: string, explorerBaseUrl = 'https://livenet.xrpl.org/tx/') {
          let finalMessage: string | SafeHtml = message;

          if (makeHashLink && hash) {
               const link = `${explorerBaseUrl}${hash}`;
               const html = `${message}View Tx in Explorer: <a href="${link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-200">${hash}</a>`;
               finalMessage = this.sanitizer.bypassSecurityTrustHtml(html);
          }
          this.show({ message: finalMessage, type: 'error' }, duration);
     }

     info(message: string, duration = 2000) {
          this.show({ message, type: 'info' }, duration);
     }

     warn(message: string, duration = 2000) {
          this.show({ message, type: 'warn' }, duration);
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
