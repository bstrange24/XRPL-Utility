import { Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppConstants } from '../../core/app.constants';
import { XrplService } from '../xrpl-services/xrpl.service';
import { BehaviorSubject } from 'rxjs';

interface Toast {
     id: number;
     message: string;
     duration: number;
}

export interface Wallet {
     name?: string;
     classicAddress: string;
     address: string;
     seed: string;
     mnemonic?: string;
     secretNumbers?: string;
     balance?: string;
     ownerCount?: string;
     xrpReserves?: string;
     spendableXrp?: string;
     showSecret?: boolean;
     lastUpdated?: any;
     isIssuer?: boolean;
     algorithm?: 'ed25519' | 'secp256k1';
     encryptionAlgorithm?: string | '';
}

export interface ValidationInputs {
     // ---- Wallet / Sender ----
     wallet: {
          address: string;
          seed?: string;
          subject?: string;
     };

     // ---- Network / XRPL ----
     network?: {
          accountInfo?: any;
          accountObjects?: any;
          fee?: string;
          currentLedger?: number;
     };

     // ---- Permission Domain Subject ---
     subject?: {
          subject?: string;
     };

     // ---- Destination ----
     destination?: {
          address?: string;
          tag?: string;
     };

     // ---- Multi-Sign ----
     multiSign?: {
          enabled: boolean;
          addresses?: string[];
          seeds?: string[];
          signerQuorum?: number;
          signers?: { account: string; weight: number }[];
     };

     // ---- Regular Key ----
     regularKey?: {
          isRegularKey: boolean;
          address?: string;
          seed?: string;
     };

     // ---- Tickets ----
     ticket?: {
          enabled: boolean;
          singleTicket?: string;
          selectedTicket?: string;
     };

     // ---- DID ----
     did?: {
          document?: any;
          uri?: string;
          data?: any;
     };

     // ---- Domain / Permissioned Domains ----
     domain?: {
          domainId?: string;
          date?: number;
     };

     // ---- Credentials  ----
     credentials?: {
          credentialType?: string;
          subject?: string;
          destination?: string;
          date?: number;
          credentialId?: string;
     };

     // ---- Sequence ID  ----
     sequence?: {
          sequenceId?: string;
     };
}

// interface ValidationInputs {
//      accountInfo: any;
//      senderAddress?: string;
//      subject?: string;
//      seed?: string;
//      destination?: string;
//      destinationTag?: string;
//      isRegularKeyAddress?: boolean;
//      regularKeyAddress?: string;
//      regularKeySeed?: string;
//      useMultiSign?: boolean;
//      multiSignAddresses?: string;
//      multiSignSeeds?: string;
//      isTicket?: boolean;
//      selectedSingleTicket?: string;
//      selectedTicket?: string; // for multi-ticket mode
//      signerQuorum?: number;
//      signers?: { account: string; weight: number }[];
//      didDocument?: any;
//      didUri?: any;
//      didData?: any;
//      date?: any;
//      domainId?: string;
// }

@Injectable({ providedIn: 'root' })
export class TransactionUiService {
     constructor(private sanitizer: DomSanitizer, private xrplService: XrplService) {}
     txHash: string | null = null;
     txHashes: string[] = [];
     isError: boolean = false;
     isSuccess: boolean = false;
     result: string = '';
     // spinner: boolean = false;
     spinnerMessage: string = '';
     private toastId = 0;

     isMemoEnabled = signal(false);
     useMultiSign = signal(false);
     isRegularKeyAddress = signal(false);
     isTicket = signal(false);
     isSimulateEnabled = signal(false);

     memoField = signal('');
     multiSignAddress = signal('');
     multiSignSeeds = signal('');
     signerQuorum = signal(0);
     regularKeyAddress = signal('');
     regularKeySeed = signal('');
     selectedSingleTicket = signal('');
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal(false);
     ticketArray = signal<string[]>([]);
     regularKeySigningEnabled = signal(false);
     spinner = signal(false);

     // Optional: current wallet if needed
     currentWallet = signal<Wallet>({} as Wallet);
     signers = signal<any[]>([]);
     toasts = signal<Toast[]>([]);
     paymentTxSignal = signal<any[]>([]);
     txSignal = signal<any[]>([]);
     txResultSignal = signal<any[]>([]);
     successMessageSignal = signal<string>('');
     spinnerMessageSignal = signal<string>('');
     executionTime = signal<string>('');
     url = signal<string>('');
     domainId = signal<string>('');

     private _infoData = new BehaviorSubject<any | null>(null);
     infoData$ = this._infoData.asObservable();

     setInfoData(data: any | null) {
          this._infoData.next(data);
     }

     setPaymentTxSignal(tx: any) {
          this.paymentTxSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxSignal(tx: any) {
          this.txSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxResultSignal(result: any) {
          this.txResultSignal.set(Array.isArray(result) ? result : [result]);
     }

     setExecutionTime(time: string) {
          this.executionTime.set(time);
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

     setUrl() {
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);
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
          this.isSimulateEnabled.set(enabled);
          // Always clear hash when switching modes
          this.txHash = null;
          this.txHashes = [];
          this.paymentTxSignal.set([]);
          this.txSignal.set([]);
          this.txResultSignal.set([]);
          this.successMessageSignal.set('');
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
          this.spinner.set(true);
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
     }

     updateSpinnerMessageSignal(message: string) {
          this.spinnerMessageSignal.set(message);
     }

     showToastMessage(message: string, duration = 3000) {
          const id = ++this.toastId;
          const toast: Toast = { id, message, duration };

          this.toasts.update(toasts => [...toasts, toast]);
          console.log('Toasts: ', this.toasts());

          // Auto-remove after duration
          setTimeout(() => {
               this.toasts.update(toasts => toasts.filter(t => t.id !== id));
          }, duration);
     }

     clearAllToasts() {
          this.toasts.set([]);
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
          this.spinner.set(false);
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
          this.spinner.set(false);
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
     }

     /**
      * Returns a fully populated ValidationInputs object
      * Used by all transaction pages (Send, Delete, TrustSet, etc.)
      */

     getValidationInputs(options: {
          wallet: Wallet;
          network?: {
               accountInfo?: any;
               accountObjects?: any;
               fee?: string;
               currentLedger?: number;
               serverInfo?: any;
          };
          destination?: {
               address?: string;
               tag?: string;
          };
          subject?: {
               subject?: string;
          };
          domain?: {
               domainId?: string;
               date?: number;
          };
          did?: {
               document?: any;
               uri?: string;
               data?: any;
          };
          credentials?: {
               credentialType?: string;
               subject?: string;
               destination?: string;
               date?: number;
               credentialId?: string;
          };
          sequence?: {
               sequenceId?: string;
          };
     }): ValidationInputs {
          return {
               wallet: {
                    address: options.wallet.address,
                    seed: options.wallet.seed,
                    subject: options.wallet.name,
               },

               network: options.network,

               destination: options.destination,

               multiSign: {
                    enabled: this.useMultiSign(),
                    addresses: this.useMultiSign()
                         ? this.multiSignAddress()
                                .split(',')
                                .map(a => a.trim())
                         : undefined,
                    seeds: this.useMultiSign()
                         ? this.multiSignSeeds()
                                .split(',')
                                .map(s => s.trim())
                         : undefined,
                    signerQuorum: this.signerQuorum(),
                    signers: this.signers(),
               },

               regularKey: {
                    isRegularKey: this.isRegularKeyAddress(),
                    address: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    seed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
               },

               ticket: {
                    enabled: this.isTicket(),
                    singleTicket: this.selectedSingleTicket() || undefined,
                    selectedTicket: this.selectedTickets().length > 0 ? this.selectedTickets()[0] : undefined,
               },

               did: options.did,

               domain: {
                    domainId: options.domain?.domainId ?? this.domainId(),
                    date: options.domain?.date, //new Date().toISOString(),
               },

               subject: {
                    subject: options.subject?.subject,
               },

               credentials: {
                    credentialType: options.credentials?.credentialType,
                    subject: options.credentials?.subject,
                    destination: options.credentials?.destination,
                    date: options.credentials?.date,
                    credentialId: options.credentials?.credentialId,
               },
          };
     }

     // getValidationInputs1(wallet: Wallet, destination: string, destinationTag: string = '', accountInfo?: any): ValidationInputs {
     //      return {
     //           // Core wallet info
     //           seed: wallet.seed,
     //           senderAddress: wallet.address,
     //           accountInfo: accountInfo,

     //           // Destination
     //           destination,
     //           destinationTag: destinationTag || undefined,

     //           // === Multi-Sign ===
     //           useMultiSign: this.useMultiSign(),
     //           multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
     //           multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
     //           signerQuorum: this.signerQuorum(),
     //           signers: this.signers(), // array of { account, seed, weight }

     //           // === Regular Key ===
     //           isRegularKeyAddress: this.isRegularKeyAddress(),
     //           regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
     //           regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,

     //           // === Ticket ===
     //           isTicket: this.isTicket(),
     //           selectedSingleTicket: this.selectedSingleTicket() || undefined,
     //           selectedTicket:
     //                this.selectedTickets().length > 0
     //                     ? this.selectedTickets()[0] // validator usually only needs first
     //                     : undefined,

     //           domainId: this.domainId(),
     //      };
     // }

     clearAllOptions() {
          this.isMemoEnabled.set(false);
          this.useMultiSign.set(false);
          this.isRegularKeyAddress.set(false);
          this.regularKeySigningEnabled.set(false);
          this.isTicket.set(false);
          this.isSimulateEnabled.set(false);
          this.memoField.set('');
          this.selectedSingleTicket.set('');
          this.selectedTickets.set([]);
     }

     clearAllOptionsAndMessages() {
          // this.clearAllOptions();
          this.clearTxResultSignal();
          this.clearTxSignal();
          this.clearMessages();
          this.clearWarning();
          this.successMessage = '';
     }
}
