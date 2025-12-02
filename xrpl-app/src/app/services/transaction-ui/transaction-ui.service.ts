import { Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class TransactionUiService {
     constructor(private sanitizer: DomSanitizer) {}
     isSimulateEnabled = false;
     txHash: string | null = null;
     txHashes: string[] = [];
     isError: boolean = false;
     isSuccess: boolean = false;
     result: string = '';
     spinner: boolean = false;
     spinnerMessage: string = '';
     showToast: boolean = false;
     toastMessage: string = '';

     txSignal = signal<any[]>([]);
     txResultSignal = signal<any[]>([]);

     setTxSignal(tx: any) {
          this.txSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxResultSignal(result: any) {
          this.txResultSignal.set(Array.isArray(result) ? result : [result]);
     }

     addTxSignal(tx: any) {
          this.txSignal.update(arr => [...arr, tx]);
     }

     clearTxSignal() {
          this.txSignal.set([]);
     }

     clearTxResultSignal() {
          this.txResultSignal.set([]);
     }

     paymentTx: any[] = [];
     txResult: any[] = [];
     txErrorHashes: any[] = [];

     private _safeInfo: SafeHtml = '';
     private _safeWarning: SafeHtml = '';
     private _infoMessage: string | null = null;
     private _warningMessage: string | null = null;
     successMessage: string | null = null;
     errorMessage: string | null = null;

     setPaymentTx(tx: any) {
          this.paymentTx = [...this.paymentTx, tx];
     }

     setTxResult(result: any) {
          this.txResult = [...this.txResult, result];
     }

     // Called when user toggles the simulate slider
     toggleSimulate(enabled: boolean) {
          this.isSimulateEnabled = enabled;

          // Always clear hash when switching modes
          this.txHash = null;
          this.txHashes = [];

          // Optional: clean up previous messages
          this._infoMessage = null;
          this._warningMessage = null;
          this.successMessage = null;
          this.errorMessage = null;
          this.clearMessages();
     }

     clearMessages() {
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txHashes = [];
          this.txResult = [];
          this.txErrorHashes = [];
          this.paymentTx = [];
          this.successMessage = '';
     }

     private allowOnly(tags: string[], html: string): SafeHtml {
          if (!html) return '';

          // 1. Escape everything first
          let escaped = html;
          html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

          // 2. Restore paired tags: <code>…</code>, <strong>…</strong>, <ul>…</ul>, <li>…</li>, etc.
          const pairedTags = tags.filter(t => t !== 'br');
          if (pairedTags.length > 0) {
               const regex = new RegExp(`&lt;(${pairedTags.join('|')})\\b[^&]*&gt;(.*?)&lt;/\\1&gt;`, 'gi');
               escaped = escaped.replace(regex, '<$1>$2</$1>');
          }

          // 3. Restore <br> and <br/>
          escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

          // 4. Restore <a> links
          escaped = escaped.replace(/&lt;a\s+href="([^"]*)"[^&]*&gt;([^&]*)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">$2</a>');

          return this.sanitizer.bypassSecurityTrustHtml(escaped);
     }

     private allowOnly1(tags: string[], html: string): SafeHtml {
          if (!html) return '';

          // 1. Escape everything
          let escaped = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

          // 2. Restore normal tags with content: <code>text</code>, <b>text</b>, etc.
          const pairedTags = tags.filter(t => t !== 'br');
          if (pairedTags.length > 0) {
               const regex = new RegExp(`&lt;(${pairedTags.join('|')})&gt;(.*?)&lt;/\\1&gt;`, 'gi');
               escaped = escaped.replace(regex, '<$1>$2</$1>');
          }

          // 3. Restore self-closing <br> and <br/>
          escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

          // 4. Restore <a> links (with href)
          escaped = escaped.replace(/&lt;a\s+href="([^"]*)"[^&]*&gt;([^&]*)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">$2</a>');

          return this.sanitizer.bypassSecurityTrustHtml(escaped);
     }

     get infoMessage(): string | null {
          return this._infoMessage;
     }
     get warningMessage(): string | null {
          return this._warningMessage;
     }

     setInfoMessage(msg: string | null) {
          this._infoMessage = msg;
          this._safeInfo = msg ? this.allowOnly(['code', 'strong', 'b', 'em', 'br', 'a', 'ul', 'li'], msg) : '';
     }

     setWarning(msg: string | null) {
          this._warningMessage = msg;
          this._safeWarning = msg ? this.allowOnly(['code', 'strong', 'b', 'em', 'br', 'a', 'ul', 'li'], msg) : '';
     }

     get safeInfo(): SafeHtml {
          return this._safeInfo;
     }
     get safeWarning(): SafeHtml {
          return this._safeWarning;
     }

     clearWarning() {
          this.setWarning(null);
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
     }

     showToastMessage(message: string, duration: number = 2000) {
          this.toastMessage = message;
          this.showToast = true;
          setTimeout(() => {
               this.showToast = false;
          }, duration);
     }

     // Called when a real transaction succeeds
     setSuccess(message: string, hash?: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });

          this.successMessage = message;
          this.errorMessage = null;

          // Only set a hash when simulate is OFF
          this.txHash = !this.isSimulateEnabled ? hash || null : null;
     }

     setSuccessProperties() {
          this.isSuccess = true;
          this.isError = false;
          this.spinner = false;
          // this.result = '';
     }

     // Called when an error occurs
     setError(message: string, hash?: string) {
          this.setErrorProperties();
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
          this.errorMessage = message;
          this.successMessage = null;

          // Only set a hash if not simulated
          this.txHash = !this.isSimulateEnabled ? hash || null : null;
     }

     private setErrorProperties() {
          this.isSuccess = false;
          this.isError = true;
          this.spinner = false;
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
     }
}
