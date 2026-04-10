import { computed, inject, Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppConstants } from '../../core/app.constants';
import { XrplService } from '../xrpl-services/xrpl.service';
import { AccountDeleteStoreService } from '../account-delete/account-delete-store/account-delete-store.service';

export type TxStep = 'idle' | 'preparing' | 'signing' | 'submitting' | 'waiting_validation' | 'waiting_for_wallet_creation' | 'finalizing' | 'success' | 'failed';

@Injectable({ providedIn: 'root' })
export class TransactionUiService {
     public readonly sanitizer = inject(DomSanitizer);
     public readonly xrplService = inject(XrplService);
     public readonly accountDeleteStoreService = inject(AccountDeleteStoreService);

     public txResult: any[] = [];
     private _safeInfo: SafeHtml = '';
     private _safeWarning: SafeHtml = '';
     private _infoMessage: string | null = null;
     public _warningMessage: string | null = null;

     txHash: string | null = null;
     txHashes: string[] = [];
     isError = signal<boolean>(false);
     isSuccess = signal<boolean>(false);
     suppressSuccessMessage = signal<boolean>(false);
     suppressIndividualFeedback = signal<boolean>(false);
     submitAndWait = signal<boolean>(false);
     result = signal<string>('');
     txSignal = signal<any[]>([]);
     txResultSignal = signal<any[]>([]);
     txHashSignal = signal<string[]>([]);
     wantsOptions = signal<boolean>(false);
     infoPanelExpanded = signal<boolean>(false);
     suppressTxClear = signal<boolean>(false);

     currentStep = signal<TxStep>('idle');
     detailedStatus = signal<string>('');
     stepMessage = computed(() => {
          const step = this.currentStep();
          switch (step) {
               case 'preparing':
                    return 'Preparing transaction...';
               case 'signing':
                    return 'Signing transaction...';
               case 'submitting':
                    return 'Broadcasting to the XRP Ledger...';
               case 'waiting_validation':
                    return 'Waiting for ledger validation (usually 4–10 seconds)...';
               case 'waiting_for_wallet_creation':
                    return 'Waiting for wallet creation and funding.';
               case 'finalizing':
                    return 'Processing final result...';
               case 'success':
                    return 'Transaction confirmed successfully!';
               case 'failed':
                    return 'Transaction failed';
               default:
                    return '';
          }
     });

     resetCurrentStepToIdle() {
          this.currentStep.set('idle');
          this.detailedStatus.set('');
     }

     explorerUrl = computed(() => {
          const env = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          return AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;
     });

     setTxSignal(tx: any) {
          this.txSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxResultSignal(result: any) {
          this.txResultSignal.set(Array.isArray(result) ? result : [result]);
     }

     addTxResultSignal(tx: any) {
          this.txResultSignal.update(arr => [...arr, tx]);
     }

     addTxHashSignal(tx: any) {
          this.txHashSignal.update(arr => [...arr, tx]);
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

     clearTxHashSignal() {
          this.txHashSignal.set([]);
     }

     setTxResult(result: any) {
          this.txResult = [...this.txResult, result];
     }

     toggleOptions(enabled: boolean): void {
          this.wantsOptions.set(enabled);
          if (!enabled) {
          }
     }

     // Called when user toggles the simulate slider
     // Always clear hash when switching modes
     toggleSimulate() {
          this.txHash = null;
          this.txHashes = [];
          this.txSignal.set([]);
          this.txResultSignal.set([]);
          this.clearMessages();
     }

     clearMessages() {
          this.result.set('');
          this.isError.set(false);
          this.isSuccess.set(false);
          this.txHash = '';
          this.txHashes = [];
          this.txResult = [];
     }

     private allowOnly(tags: string[], html: string): SafeHtml {
          if (!html) return '';

          // 1. Escape everything first
          let escaped = html;
          html.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

          // 2. Restore paired tags: <code>…</code>, <strong>…</strong>, <ul>…</ul>, <li>…</li>, etc.
          const pairedTags = tags.filter(t => t !== 'br');
          if (pairedTags.length > 0) {
               const regex = new RegExp(String.raw`&lt;(${pairedTags.join('|')})\b[^&]*&gt;(.*?)&lt;/\1&gt;`, 'gi');
               escaped = escaped.replaceAll(regex, '<$1>$2</$1>');
          }

          // 3. Restore <br> and <br/>
          escaped = escaped.replaceAll(/&lt;br\s*\/?&gt;/gi, '<br>');

          // 4. Restore <a> links
          escaped = escaped.replaceAll(/&lt;a\s+href="([^"]*)"[^&]*&gt;([^&]*)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">$2</a>');

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

     // Called when a real transaction succeeds
     setSuccess(message: string, hash?: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError(),
               isSuccess: this.isSuccess(),
          });
          this.txHash = hash || null;
     }

     setSuccessProperties() {
          this.isSuccess.set(true);
          this.isError.set(false);
     }

     setSuccessMultiTransactionsProperties() {
          this.isSuccess.set(true);
          this.isError.set(false);
     }

     // Called when an error occurs
     setError(message: string, hash?: string) {
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError(),
               isSuccess: this.isSuccess(),
          });
          this.txHash = hash || null;
     }

     private setErrorProperties() {
          this.isSuccess.set(false);
          this.isError.set(true);
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result.set(event.result);
          this.isError.set(event.isError);
          this.isSuccess.set(event.isSuccess);
     }

     clearAllFields() {
          this.wantsOptions.set(false);
     }

     clearAllOptionsAndMessages() {
          // Keep the txJson and txResult displayed when deleting an account,
          // or when a background wallet refresh is in progress after a transaction.
          if (!this.suppressTxClear() && this.accountDeleteStoreService.savedTxJson().length <= 0 && this.accountDeleteStoreService.savedTxResult().length <= 0) {
               this.clearTxResultsHash();
          }
          this.clearMessages();
     }

     clearTxResultsHash() {
          this.clearTxResultSignal();
          this.clearTxHashSignal();
          this.clearTxSignal();
     }
}
