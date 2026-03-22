import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppConstants } from '../../core/app.constants';
import { XrplService } from '../xrpl-services/xrpl.service';
import { DidData, DidItem, Signer, Toast, ValidationInputs, Wallet } from '../../models/interface-items.model';

interface TransactionUiSignals {
     // Base
     isSimulateEnabled: boolean;
     useMultiSign: boolean;
     isRegularKeyAddress: boolean;
     regularKeyAddress: string;
     regularKeySeed: string;
     multiSignAddress: string;
     multiSignSeeds: string;
     suppressIndividualFeedback: string;
     submitAndWait: boolean;

     // Account
     signerQuorum: number;
     masterKeyDisabled: boolean;
     depositAuthEnabled: boolean;
     isdepositAuthAddress: boolean;
     isNFTokenMinterEnabled: boolean;
     nfTokenMinterAddress: string;
     isUpdateMetaData: boolean;
     isHolderConfiguration: boolean;
     isExchangerConfiguration: boolean;
     isIssuerConfiguration: boolean;
     isAuthorizedNFTokenMinter: boolean;
     depositAuthAddress: string;
     tickSize: string;
     transferRate: string;
     isMessageKey: boolean;
     domain: string;
     url: string;

     // Trustlines
     trustlineLimitField: number;
     currencyCode: string;
     currencyIssuer: string;
     tokenToRemove: string;
     lastCurrency: string;
     lastIssuer: string;
     userAddedissuerFields: string;
     newCurrency: string;
     newIssuer: string;
     issuerToRemove: string;
     trustlineFlags: number;
     showEnableTrustline: boolean;
     currency: string;
     issuer: string;

     // Creds and P Domains
     subject: string;
     credentialID: string;
     credentialIssuer: string;
     credentialType: string;
     domainId: string;

     // Payment and Checks
     destinationTagField: string;
     sourceTagField: string;
     invoiceIdField: string;
     checkIdField: string;
     checkCreator: string;
     amountField: string;
     destinationAddress: string;

     // Escrows
     escrowFinishTimeField: string;
     escrowCancelTimeField: string;
     escrowOwnerField: string;
     escrowSequenceNumberField: string;
     escrowConditionField: string;
     escrowFulfillmentField: string;
     finishAfter: number;
     cancelAfter: number;
}

export type TxStep = 'idle' | 'preparing' | 'signing' | 'submitting' | 'waiting_validation' | 'waiting_for_wallet_creation' | 'finalizing' | 'success' | 'failed';

export type ButtonLoadingState = {
     generateNewWalletFromSeed: boolean;
     generateNewWalletFromMnemonic: boolean;
     generateNewWalletFromSecretNumbers: boolean;
     deriveWalletFromFamilySeed: boolean;
     deriveWalletFromMnemonic: boolean;
     deriveWalletFromSecretNumbers: boolean;
};

export type SignalMap = {
     [K in keyof TransactionUiService]: TransactionUiService[K] extends (...args: any) => any ? never : TransactionUiService[K] extends () => unknown ? K : never;
};

export type SignalKey = keyof TransactionUiSignals;

@Injectable({ providedIn: 'root' })
export class TransactionUiService {
     public readonly sanitizer = inject(DomSanitizer);
     public readonly xrplService = inject(XrplService);

     readonly baseTxKeys = ['isSimulateEnabled', 'useMultiSign', 'isRegularKeyAddress', 'regularKeyAddress', 'regularKeySeed', 'multiSignAddress', 'multiSignSeeds'] as const;
     txHash: string | null = null;
     txHashes: string[] = [];
     isError = signal<boolean>(false);
     isSuccess = signal<boolean>(false);
     suppressSuccessMessage = signal<boolean>(false);
     suppressIndividualFeedback = signal<boolean>(false);
     submitAndWait = signal<boolean>(false);
     result = signal<string>('');
     spinnerMessage = signal<string>('');
     toastId = 0;
     errorMessageSignal = signal<string | null>(null);
     spinner = signal<boolean>(false);
     currentWallet = signal<Wallet>({} as Wallet);
     toasts = signal<Toast[]>([]);
     paymentTxSignal = signal<any[]>([]);
     txSignal = signal<any[]>([]);
     txResultSignal = signal<any[]>([]);
     txHashSignal = signal<string[]>([]);
     successMessageSignal = signal<string>('');
     spinnerMessageSignal = signal<string>('');
     executionTime = signal<string>('');
     wantsOptions = signal<boolean>(false);
     infoPanelExpanded = signal<boolean>(false);

     // Payment
     amountField = signal<string>('');
     destinationTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     sourceTagField = signal<string>('');
     domainId = signal<string>('');

     // Checks
     checkIdField = signal<string>('');
     checkCreator = signal<string>('');

     // Tokens + Trustlines
     trustlineLimitField = signal<number>(0);
     currencyCode = signal<string>('XRP');
     currencyIssuer = signal<string>('');
     tokenToRemove = signal<string>('');
     lastCurrency = signal<string>('');
     lastIssuer = signal<string>('');
     userAddedissuerFields = signal<string>('');
     newCurrency = signal<string>('');
     newIssuer = signal<string>('');
     issuerToRemove = signal<string>('');
     trustlineFlags = signal<number>(0);
     // showEnableTrustline = signal<boolean>(false);
     missingTrustlineInfo = {
          currencyCode: signal<string>(''),
          issuer: signal<string>(''),
     };
     currency = signal<string>('');
     issuer = signal<string>('');

     // Tickets
     // ticketCountField = signal<string>('');
     // selectedTicketSequences = signal<string[]>([]);

     // Expiration Dates
     expirationTimeField = signal<string>('');
     enableExpirationDate = signal<boolean>(false);
     enableEscrowFinishAfterExpirationDate = signal<boolean>(false);
     enableEscrowCancelAfterExpirationDate = signal<boolean>(false);

     // Account config
     memoField = signal<string>('');
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     signerQuorum = signal<number>(0);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     isMemoEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     multiSigningEnabled = signal<boolean>(false);
     signers: WritableSignal<Signer[]> = signal<Signer[]>([{ Account: '', seed: '', SignerWeight: 1 }]);
     depositAuthAddresses = signal<{ account: string }[]>([{ account: '' }]);
     // walletTicketCount = signal<number>(0);
     masterKeyDisabled = signal<boolean>(false);
     depositAuthEnabled = signal<boolean>(false);
     isdepositAuthAddress = signal<boolean>(false);
     isNFTokenMinterEnabled = signal<boolean>(false);
     nfTokenMinterAddress = signal<string>('');
     isUpdateMetaData = signal<boolean>(false);
     isHolderConfiguration = signal<boolean>(false);
     isExchangerConfiguration = signal<boolean>(false);
     isIssuerConfiguration = signal<boolean>(false);
     isAuthorizedNFTokenMinter = signal<boolean>(false);
     depositAuthAddress = signal<string>('');
     tickSize = signal<string>('');
     transferRate = signal<string>('');
     isMessageKey = signal<boolean>(false);
     domain = signal<string>('');
     url = signal<string>('');
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     // Escrows
     escrowFinishTimeField = signal<string>('');
     escrowCancelTimeField = signal<string>('');
     escrowOwnerField = signal<string>('');
     escrowSequenceNumberField = signal<string>('');
     escrowConditionField = signal<string>('');
     escrowFulfillmentField = signal<string>('');
     finishAfter = signal<number>(0);
     cancelAfter = signal<number>(0);

     // Payment Channel
     channelIDField = signal<string>('');
     settleDelayField = signal<string>('');
     publicKeyField = signal<string>('');
     channelClaimSignatureField = signal<string>('');
     authorizedWalletAddress = signal<string>('');
     authorizedWallets: { name?: string; address: string }[] = [];
     paymentChannelCancelAfterTimeField = signal<string>('');

     // MPT
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal<boolean>(false);
     metaDataField = signal<string>('');
     authAction = signal<string>('authorize');
     lockAction = signal<string>('unlock');
     metadataError = signal<string>('');
     tokenCountField = signal<number>(0);
     assetScaleField = signal<number>(0);
     isMptFlagModeEnabled = signal<boolean>(false);
     transferFeeField = signal<number>(0);
     isAuthorized = signal<boolean>(false);
     isUnauthorize = signal<boolean>(false);
     lockedUnlock = signal<string>('');
     holderAccount = signal<string>('');

     // Wallets
     mnemonicInput = signal<string>('');
     // mnemonicValid = signal<boolean>(false);
     secretNumberInput = signal<string[]>([]);
     secretNumberValid = signal<boolean>(false);
     seedInput = signal<string>('');
     seedValid = signal<boolean>(false);
     encryptionType = signal<string>('');
     seed = signal<string>('');
     mnemonic = signal<string>('');
     secretNumbers = signal<string>('');
     ed25519_encryption_type = signal<boolean>(false);
     secp256k1_encryption_type = signal<boolean>(true);
     buttonLoading = signal<ButtonLoadingState>({
          generateNewWalletFromSeed: false,
          generateNewWalletFromMnemonic: false,
          generateNewWalletFromSecretNumbers: false,
          deriveWalletFromFamilySeed: false,
          deriveWalletFromMnemonic: false,
          deriveWalletFromSecretNumbers: false,
     });

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
                    // return 'Waiting for ledger validation (usually 4–10 seconds)... The transaction will still process even if you leave this page.';
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

     getValues<K extends SignalKey>(keys: readonly K[]): { [P in K]: any } {
          const result = {} as { [P in K]: any };

          for (const key of keys) {
               result[key] = (this as any)[key]();
          }

          return result;
     }

     buildTxKeys(...extra: SignalKey[]) {
          return [...this.baseTxKeys, ...extra] as const;
     }

     resetCurrentStepToIdle() {
          this.currentStep.set('idle');
          this.detailedStatus.set('');
     }

     explorerUrl = computed(() => {
          const env = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          return AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;
     });

     setPaymentTxSignal(tx: any) {
          this.paymentTxSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxSignal(tx: any) {
          this.txSignal.set(Array.isArray(tx) ? tx : [tx]);
     }

     setTxResultSignal(result: any) {
          this.txResultSignal.set(Array.isArray(result) ? result : [result]);
     }

     addTxResultSignal(tx: any) {
          this.txResultSignal.update(arr => [...arr, tx]);
     }

     setExecutionTime(time: string) {
          this.executionTime.set(time);
     }

     addTxHashSignal(tx: any) {
          this.txHashSignal.update(arr => [...arr, tx]);
     }

     addTxSignal(tx: any) {
          this.txSignal.update(arr => [...arr, tx]);
     }

     addPaymentTxSignal(tx: any) {
          this.paymentTxSignal.update(arr => [...arr, tx]);
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

     addSignersSignal(tx: any) {
          this.signers.update(arr => [...arr, tx]);
     }

     removeSignerSignal(index: number) {
          this.signers.update(arr => arr.filter((_, i) => i !== index));
     }

     addDepositAuthAddressesSignal(tx: any) {
          this.depositAuthAddresses.update(arr => [...arr, tx]);
     }

     removeDepositAuthAddressesSignal(index: number) {
          this.depositAuthAddresses.update(arr => arr.filter((_, i) => i !== index));
     }

     setUrl() {
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);
     }

     getUrl() {
          return this.url();
     }

     paymentTx: any[] = [];
     txResult: any[] = [];
     txErrorHashes: any[] = [];

     private _safeInfo: SafeHtml = '';
     private _safeWarning: SafeHtml = '';
     private _safeError: SafeHtml = '';
     private _infoMessage: string | null = null;
     public _warningMessage: string | null = null;
     private _errorMessage: string | null = null;
     // successMessage: string | null = null;

     // errorMessage: string | null = null;

     setPaymentTx(tx: any) {
          this.paymentTx = [...this.paymentTx, tx];
     }

     setTxResult(result: any) {
          this.txResult = [...this.txResult, result];
     }

     // toggleShowEnableTrustline(enabled: boolean) {
     //      this.showEnableTrustline.set(enabled);
     // }

     toggleOptions(enabled: boolean): void {
          this.wantsOptions.set(enabled);
          if (!enabled) {
               this.clearOptionalInputFields();
          }
     }

     // Called when user toggles the simulate slider
     toggleSimulate() {
          // Always clear hash when switching modes
          this.txHash = null;
          this.txHashes = [];
          this.paymentTxSignal.set([]);
          this.txSignal.set([]);
          this.txResultSignal.set([]);
          this.successMessageSignal.set('');
          this.errorMessageSignal.set(null);
          this.clearMessages();
     }

     clearMessages() {
          this.result.set('');
          this.isError.set(false);
          this.isSuccess.set(false);
          this.txHash = '';
          this.txHashes = [];
          this.txResult = [];
          this.txErrorHashes = [];
          this.paymentTx = [];
          // this.successMessage = '';
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

     setSafeError(msg: string | null) {
          this._errorMessage = msg;
          this._safeError = msg ? this.allowOnly(['code', 'strong', 'b', 'em', 'br', 'a', 'ul', 'li'], msg) : '';
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

     async showWithDelay(message: string, delayMs: number = 200) {
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner.set(true);
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     updateSpinnerMessage(message: string) {
          this.spinnerMessage.set(message);
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

     setSuccessMultiTransactions(message: string, hash?: string) {
          this.setSuccessMultiTransactionsProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError(),
               isSuccess: this.isSuccess(),
          });

          // this.successMessage = message;
          // this.errorMessage = null;
          this.errorMessageSignal.set(null);

          // Only set a hash when simulate is OFF
          // this.txHash = this.isSimulateEnabled() ? null : hash || null;
          this.txHash = hash || null;
     }

     // Called when a real transaction succeeds
     setSuccess(message: string, hash?: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError(),
               isSuccess: this.isSuccess(),
          });

          // this.successMessage = message;
          // this.errorMessage = null;
          this.errorMessageSignal.set(null);

          // Only set a hash when simulate is OFF
          // this.txHash = this.isSimulateEnabled() ? null : hash || null;
          this.txHash = hash || null;
     }

     setSuccessProperties() {
          this.isSuccess.set(true);
          this.isError.set(false);
          this.spinner.set(false);
     }

     setSuccessMultiTransactionsProperties() {
          this.isSuccess.set(true);
          this.isError.set(false);
          this.spinner.set(true);
     }

     // Called when an error occurs
     setError(message: string, hash?: string) {
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError(),
               isSuccess: this.isSuccess(),
          });
          // this.errorMessage = message;
          this.errorMessageSignal.set(message);
          // this.successMessage = null;

          // Only set a hash if not simulated
          // this.txHash = this.isSimulateEnabled() ? null : hash || null;
          this.txHash = hash || null;
     }

     private setErrorProperties() {
          this.isSuccess.set(false);
          this.isError.set(true);
          this.spinner.set(false);
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result.set(event.result);
          this.isError.set(event.isError);
          this.isSuccess.set(event.isSuccess);
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
          amountXrp?: {
               amount?: string;
          };
          paymentXrp?: {
               amount?: string;
               destination?: string;
               destinationTag?: string;
               sourceTag?: string;
               invoiceId?: any;
          };
          createCheck?: {
               amount?: string;
               destination?: string;
               destinationTag?: string;
               sourceTag?: string;
               invoiceId?: any;
          };
          cashCheck?: {
               amount?: string;
               checkIdField?: string;
          };
          cancelCheck?: {
               checkIdField?: string;
          };
          createTicket?: {
               ticketCountField?: any;
          };
          createTimeBasedEscrow?: {
               amount?: string;
               destination?: string;
               finishAfter?: number;
               cancelAfter?: number;
               currency?: string;
               issuer?: string;
          };
          finishTimeBasedEscrow?: {
               escrowOwner?: string;
               escrowSequence?: string;
          };
          cancelTimeBasedEscrow?: {
               escrowSequence?: string;
          };
          createConditionalEscrow?: {
               amount?: string;
               destination?: string;
               finishAfter?: number;
               cancelAfter?: number;
               currency?: string;
               issuer?: string;
               condition?: string;
          };
          finishConditionalEscrow?: {
               escrowOwner?: string;
               escrowSequence?: string;
               condition?: string;
               fulfillment?: string;
          };
          paymentChannelCreate?: {
               amount?: string;
               destination?: string;
               settleDelay?: string;
          };
          paymentChannelFund?: {
               amount?: string;
               channelIDField?: string;
          };
          paymentChannelClaim?: {
               amount?: string;
               channelIDField?: string;
               claimSignature?: string;
          };
          paymentChannelClose?: {
               channelIDField?: string;
          };
          regularKey?: {
               isRegularKey: boolean;
               address: string;
               seed: string;
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
               amountXrp: options.amountXrp,
               paymentXrp: {
                    amount: this.amountField(),
                    destination: options?.paymentXrp?.destination,
                    destinationTag: this.destinationTagField(),
                    sourceTag: this.sourceTagField(),
                    invoiceId: this.invoiceIdField(),
                    // credentials: this.credentialIDs(),
               },
               createCheck: {
                    amount: this.amountField(),
                    destination: options?.createCheck?.destination,
               },
               cashCheck: {
                    amount: this.amountField(),
                    checkIdField: this.checkIdField(),
               },
               cancelCheck: {
                    checkIdField: this.checkIdField(),
               },
               // createTicket: {
               //      ticketCountField: this.ticketCountField(),
               // },
               createTimeBasedEscrow: {
                    amount: this.amountField(),
                    destination: options?.createTimeBasedEscrow?.destination,
                    finishAfter: options?.createTimeBasedEscrow?.finishAfter || this.finishAfter(),
                    cancelAfter: options?.createTimeBasedEscrow?.cancelAfter || this.cancelAfter(),
                    currency: this.currency(),
                    issuer: this.issuer(),
               },
               finishTimeBasedEscrow: {
                    escrowOwner: options?.finishTimeBasedEscrow?.escrowOwner,
                    escrowSequence: options?.finishTimeBasedEscrow?.escrowSequence,
               },
               cancelTimeBasedEscrow: {
                    escrowSequence: options?.cancelTimeBasedEscrow?.escrowSequence,
               },
               createConditionalEscrow: {
                    amount: this.amountField(),
                    destination: options?.createConditionalEscrow?.destination,
                    finishAfter: options?.createConditionalEscrow?.finishAfter || this.finishAfter(),
                    cancelAfter: options?.createConditionalEscrow?.cancelAfter || this.cancelAfter(),
                    currency: this.currency(),
                    issuer: this.issuer(),
                    condition: options?.createConditionalEscrow?.condition,
               },
               finishConditionalEscrow: {
                    escrowOwner: options?.finishConditionalEscrow?.escrowOwner,
                    escrowSequence: options?.finishConditionalEscrow?.escrowSequence,
                    condition: options?.finishConditionalEscrow?.condition,
                    fulfillment: options?.finishConditionalEscrow?.fulfillment,
               },
               paymentChannelCreate: {
                    amount: this.amountField(),
                    destination: options?.paymentChannelCreate?.destination,
                    settleDelay: options?.paymentChannelCreate?.settleDelay,
               },
               paymentChannelFund: {
                    amount: options?.paymentChannelFund?.amount,
                    channelIDField: options?.paymentChannelFund?.channelIDField,
               },
               paymentChannelClaim: {
                    amount: options?.paymentChannelClaim?.amount,
                    channelIDField: options?.paymentChannelClaim?.channelIDField,
                    claimSignature: options?.paymentChannelClaim?.claimSignature,
               },
               paymentChannelClose: {
                    channelIDField: options?.paymentChannelClose?.channelIDField,
               },
               // multiSign: {
               //      enabled: this.useMultiSign(),
               //      addresses: this.useMultiSign()
               //           ? this.multiSignAddress()
               //                  .split(',')
               //                  .map(a => a.trim())
               //           : undefined,
               //      seeds: this.useMultiSign()
               //           ? this.multiSignSeeds()
               //                  .split(',')
               //                  .map(s => s.trim())
               //           : undefined,
               //      signerQuorum: this.signerQuorum(),
               //      signers: this.signers(),
               // },

               // regularKey: {
               //      isRegularKey: this.isRegularKeyAddress(),
               //      address: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
               //      seed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
               // },

               // ticket: {
               //      enabled: this.isTicket(),
               //      singleTicket: this.selectedSingleTicket() || undefined,
               //      selectedTicket: this.selectedTickets().length > 0 ? this.selectedTickets()[0] : undefined,
               // },

               did: options.did,

               domain: {
                    domainId: options.domain?.domainId ?? this.domainId(),
                    date: options.domain?.date,
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

     clearAllFields() {
          this.amountField.set('');
          this.checkIdField.set('');
          this.destinationTagField.set('');
          this.invoiceIdField.set('');
          this.sourceTagField.set('');
          this.nfTokenMinterAddress.set('');
          this.depositAuthAddress.set('');
          this.tickSize.set('');
          this.transferRate.set('');
          this.isMessageKey.set(false);
          this.domain.set('');
          this.memoField.set('');
          // this.regularKeyAddress.set('');
          // this.regularKeySeed.set('');
          // this.selectedSingleTicket.set('');
          this.wantsOptions.set(false);
          this.escrowFinishTimeField.set('');
          this.escrowCancelTimeField.set('');
          this.escrowOwnerField.set('');
          this.escrowSequenceNumberField.set('');
          this.isMptEnabled.set(false);
          this.metaDataField.set('');
          this.authAction.set('authorize');
          this.lockAction.set('unlock');
          this.metadataError.set('');
          this.tokenCountField.set(0);
          this.assetScaleField.set(0);
          this.isMptFlagModeEnabled.set(false);
          this.transferFeeField.set(0);
          this.isAuthorized.set(false);
          this.isUnauthorize.set(false);
          this.lockedUnlock.set('');
          this.holderAccount.set('');
          this.expirationTimeField.set('');
          this.enableExpirationDate.set(false);
          this.enableEscrowFinishAfterExpirationDate.set(false);
          this.enableEscrowCancelAfterExpirationDate.set(false);
          // this.showEnableTrustline.set(false);
          this.domainId.set('');
     }

     clearAllOptions() {
          // this.showEnableTrustline.set(false);
          this.isMemoEnabled.set(false);
          // this.useMultiSign.set(false);
          // this.isRegularKeyAddress.set(false);
          // this.isTicket.set(false);
          // this.isSimulateEnabled.set(false);
          this.memoField.set('');
          // this.selectedSingleTicket.set('');
          // this.selectedTickets.set([]);
     }

     clearAllOptionsAndMessages() {
          // this.errorMessage = '';
          this.errorMessageSignal.set(null);
          this.updateSpinnerMessageSignal('');
          this.clearTxResultsHash();
          this.clearMessages();
          // this.successMessage = '';
     }

     clearTxResultsHash() {
          this.clearTxResultSignal();
          this.clearTxHashSignal();
          this.clearTxSignal();
     }

     clearOptionalInputFields() {
          this.destinationTagField.set('');
          this.sourceTagField.set('');
          this.invoiceIdField.set('');
          this.domainId.set('');
          // this.credentialIDs.set([]);
     }

     // clearOptionalExpirationDate() {
     //      this.credential().subject.expirationDate = '';
     // }
}
