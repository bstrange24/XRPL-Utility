import { Injectable, ElementRef, ViewChild, WritableSignal, Signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { walletFromSecretNumbers, Wallet } from 'xrpl';
import { XrplService } from '../xrpl-services/xrpl.service';
import { AppConstants } from '../../core/app.constants';
import { sha256 } from 'js-sha256';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { StorageService } from '../local-storage/storage.service';
import md5 from 'blueimp-md5';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { MPToken, RippleState } from '../../models/interface-items.model';
import * as bip39 from 'bip39';

type FlagResult = Record<string, boolean> | string | null;
type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;
type DidValidationResult = {
     success: boolean;
     hexData?: string;
     errors?: string;
};

type InputType = 'seed' | 'mnemonic' | 'secret_numbers' | 'unknown';

@Injectable({
     providedIn: 'root',
})
export class UtilsService {
     @ViewChild('resultField') resultField!: ElementRef<HTMLDivElement>;
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     spinner: boolean = false;

     constructor(
          private readonly xrplService: XrplService,
          private readonly storageService: StorageService,
          private readonly walletManagerService: WalletManagerService,
          public readonly txUiService: TransactionUiService
     ) {}

     MPT_FLAGS: Record<number, string> = {
          0x00000001: 'MptLocked',
          0x00000002: 'CanLock',
          0x00000004: 'RequireAuth',
          0x00000008: 'CanEscrow',
          0x00000010: 'CanTrade',
          0x00000020: 'CanTransfer',
          0x00000040: 'CanClawback',
     };

     ledgerEntryTypeFields = {
          AccountRoot: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Balance', format: (v: any) => this.formatXRPLAmount(v || '0') },
                    { key: 'Sequence', format: (v: any) => v || null },
                    { key: 'OwnerCount', format: (v: any) => v || '0' },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'Domain', format: (v: any) => v || null },
                    { key: 'EmailHash', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
                    { key: 'FirstNFTokenSequence', format: (v: any) => v || null },
                    { key: 'MintedNFTokens', format: (v: any) => v || '0' },
                    { key: 'Flags', format: (v: any) => v || '0' },
               ],
               label: 'Account',
               pluralLabel: 'Accounts',
          },
          Escrow: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Amount', format: (v: any) => this.formatXRPLAmount(v || '0') },
                    { key: 'Destination', format: (v: any) => v || null },
                    { key: 'DestinationTag', format: (v: any) => v || null },
                    { key: 'Sequence', format: (v: any) => v || null },
                    { key: 'CancelAfter', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'FinishAfter', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'Condition', format: (v: any) => v || null },
                    { key: 'memo', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Escrow',
               pluralLabel: 'Escrows',
          },
          Offer: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'TakerPays', format: (v: any) => (typeof v === 'object' ? `${v.value} ${v.currency}` : this.formatXRPLAmount(v || '0')) },
                    { key: 'TakerGets', format: (v: any) => (typeof v === 'object' ? `${v.value} ${v.currency}` : this.formatXRPLAmount(v || '0')) },
                    { key: 'Expiration', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'OfferSequence', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Offer',
               pluralLabel: 'Offers',
          },
          RippleState: {
               fields: [
                    { key: 'Balance', format: (v: any) => (typeof v === 'object' ? this.formatXRPLAmount(v) : v || null) },
                    { key: 'Flags', format: (v: any) => this.getFlagName(v) || '0' },
                    { key: 'HighLimit', format: (v: any) => (typeof v === 'object' ? this.formatXRPLAmount(v) : v || null) },
                    { key: 'HighNode', format: (v: any) => v || null },
                    { key: 'LedgerEntryType', format: (v: any) => v || null },
                    { key: 'LowLimit', format: (v: any) => (typeof v === 'object' ? this.formatXRPLAmount(v) : v || null) },
                    { key: 'LowNode', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'RippleState',
               pluralLabel: 'RippleStates',
          },
          PayChannel: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Destination', format: (v: any) => v || null },
                    { key: 'Amount', format: (v: any) => this.formatXRPLAmount(v || '0') },
                    { key: 'Balance', format: (v: any) => this.formatXRPLAmount(v || '0') },
                    { key: 'SettleDelay', format: (v: any) => v || null },
                    { key: 'Expiration', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'CancelAfter', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Payment Channel',
               pluralLabel: 'Payment Channels',
          },
          Check: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Destination', format: (v: any) => v || null },
                    { key: 'Expiration', format: (v: any) => (v ? this.convertXRPLTime(v) : null) },
                    { key: 'SendMax', format: (v: any) => (typeof v === 'object' ? `${v.value} ${v.currency}` : this.formatXRPLAmount(v || '0')) },
                    { key: 'Sequence', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Check',
               pluralLabel: 'Checks',
          },
          DepositPreauth: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Authorize', format: (v: any) => v || null },
                    { key: 'Flags', format: (v: any) => v || null },
                    { key: 'OwnerNode', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Deposit Preauthorization',
               pluralLabel: 'Deposit Preauthorizations',
          },
          Ticket: {
               fields: [
                    { key: 'Account', format: (v: any) => v || null },
                    { key: 'Flags', format: (v: any) => this.decodeNFTFlags(Number(v)) },
                    { key: 'TicketSequence', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Ticket',
               pluralLabel: 'Tickets',
          },
          DirectoryNode: {
               fields: [
                    { key: 'Flags', format: (v: any) => v || '0' },
                    { key: 'Owner', format: (v: any) => v || null },
                    { key: 'Indexes', format: (v: any) => (Array.isArray(v) ? v.join(', ') : v || null) },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
                    { key: 'RootIndex', format: (v: any) => v || null },
               ],
               label: 'Directory',
               pluralLabel: 'Directories',
          },
          AMM: {
               fields: [
                    { key: 'LPTokenBalance', format: (v: any) => `${v.value} ${v.currency}` },
                    { key: 'TradingFee', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Automated Market Maker',
               pluralLabel: 'Automated Market Makers',
          },
          NFTokenPage: {
               fields: [
                    { key: 'Flags', format: (v: any) => v || '0' },
                    { key: 'LedgerEntryType', format: (v: any) => v || null },
                    { key: 'NFTokens', format: (v: any) => (Array.isArray(v) ? v : null) },
                    { key: 'index', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
               ],
               label: 'NFTokenPage',
               pluralLabel: 'NFTokenPages',
          },
          SignerList: {
               fields: [
                    { key: 'Flags', format: (v: any) => v || null },
                    { key: 'SignerQuorum', format: (v: any) => v || null },
                    { key: 'SignerEntries', format: (v: any) => (Array.isArray(v) ? v.map(e => e.SignerEntry.Account).join(', ') : null) },
                    { key: 'SignerListID', format: (v: any) => v || null },
                    { key: 'PreviousTxnID', format: (v: any) => v || null },
                    { key: 'PreviousTxnLgrSeq', format: (v: any) => v || null },
                    { key: 'index', format: (v: any) => v || null },
               ],
               label: 'Signer List',
               pluralLabel: 'Signer Lists',
          },
          NFT: {
               fields: [
                    { key: 'Flags', format: (v: any) => this.decodeNFTFlags(Number(v)) },
                    { key: 'Issuer', format: (v: any) => v || null },
                    { key: 'NFTokenID', format: (v: any) => v || null },
                    { key: 'NFTokenTaxon', format: (v: any) => (v === 0 ? null : v || null) },
                    { key: 'URI', format: (v: any) => v || null },
                    { key: 'nft_serial', format: (v: any) => v || null },
               ],
               label: 'NFT',
               pluralLabel: 'NFTs',
          },
     };

     sleep(ms: number): Promise<void> {
          return new Promise(resolve => {
               setTimeout(() => {
                    resolve();
               }, ms);
          });
     }

     encodeIfNeeded(currency: string): string {
          return currency?.length > 3 ? this.encodeCurrencyCode(currency) : currency || '';
     }

     decodeIfNeeded(value: string): string {
          return this.isCurrencyCode(value) ? this.decodeCurrencyCode(value) : value;
     }

     isCurrencyCode(value: string): boolean {
          // Heuristic: XRP-style currency codes are either "XRP" or 3+ chars / 160-bit hex
          return value !== 'XRP' && value.length > 3;
     }

     validateCondition(condition: string | undefined | null): string | null {
          // Check if condition is provided and non-empty
          if (!this.validateInput(condition)) {
               return 'Condition cannot be empty';
          }

          // Ensure condition is a valid hex string (uppercase, 0-9, A-F)
          const hexRegex = /^[0-9A-F]+$/;
          if (!hexRegex.test(condition!)) {
               return 'Condition must be a valid uppercase hex string (0-9, A-F)';
          }

          // Check length for SHA-256 (32 bytes = 64 hex characters)
          if (condition!.length !== 64) {
               return 'Condition must be 64 hex characters (32 bytes) for SHA-256';
          }

          return null;
     }

     validateFulfillment(fulfillment: string | undefined | null, condition: string): string | null {
          if (!this.validateInput(fulfillment)) {
               return 'Fulfillment cannot be empty';
          }
          const hexRegex = /^[0-9A-F]+$/;
          if (!hexRegex.test(fulfillment!)) {
               return 'Fulfillment must be a valid uppercase hex string (0-9, A-F)';
          }
          try {
               // Convert hex to binary and compute SHA-256 hash
               const fulfillmentBytes = Buffer.from(fulfillment!, 'hex'); // Buffer polyfill or use Uint8Array
               const computedHash = sha256(fulfillmentBytes).toUpperCase();
               if (computedHash !== condition) {
                    return 'Fulfillment does not match the condition';
               }
          } catch (error: any) {
               console.error(`Error validateFulfillment ${error.message}`);
               return 'Invalid fulfillment: unable to compute SHA-256 hash';
          }
          return null;
     }

     validateInput(input: string | undefined | null): boolean {
          return typeof input === 'string' && !!input.trim();
     }

     isValidTransactionHash(input: string): boolean {
          return /^[0-9A-Fa-f]{64}$/.test(input);
     }

     parseAndValidateNFTokenIDs(idsString: string): string[] {
          const ids = idsString.split(',').map(id => id.trim());
          const validIds = ids.filter(id => /^[0-9A-Fa-f]{64}$/.test(id));
          return validIds;
     }

     isValidCTID(input: string): boolean {
          return /^C[0-9A-Fa-f]+$/.test(input);
     }

     formatXRPLAmount = (value: any): string => {
          if (value == null || Number.isNaN(value)) {
               return 'Invalid amount';
          }

          if (typeof value === 'object' && value.currency && value.value) {
               const issuerSuffix = value.issuer ? ` (Issuer: ${value.issuer})` : '';
               return `${value.value} ${value.currency}${issuerSuffix}`;
          }
          return `${(Number.parseInt(value) / 1000000).toFixed(6)} XRP`;
     };

     isValidDate(value: any): boolean {
          return value && !Number.isNaN(new Date(value).getTime());
     }

     isValidAddress(address: string): boolean {
          return xrpl.isValidAddress(address);
     }

     jsonToHex(obj: string | object): string {
          const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
          return Buffer.from(str, 'utf8').toString('hex');
     }

     hexTojson(obj: string | object): string {
          const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
          return Buffer.from(str, 'hex').toString('utf8');
     }

     parseUiJson(object: string): any {
          try {
               if (object === 'N/A' || !object) return null;
               const parsed = JSON.parse(object);
               // Check if it's an array and has at least one item
               if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed[0].Credential; // Return just the Credential object
               }
               return parsed;
          } catch (error: any) {
               console.error(`Error parsing JSON ${error.message}\n Returning original JSON.`);
               return object;
          }
     }

     validateAndConvertDidJson(didJsonString: string, didSchema: object): DidValidationResult {
          const ajv = new Ajv({ allErrors: true });
          addFormats(ajv);
          const validate = ajv.compile(didSchema);

          try {
               const parsed = JSON.parse(didJsonString);

               // Handle array of documents or single document
               if (Array.isArray(parsed)) {
                    for (let i = 0; i < parsed.length; i++) {
                         const doc = parsed[i];
                         const valid = validate(doc);
                         if (!valid) {
                              console.error(`Document ${i} invalid:`, validate.errors);
                              return { success: false, errors: `Document ${i} invalid: ${JSON.stringify(validate.errors)}` };
                         }
                         console.log(`Document ${i} valid!`);
                    }
               } else {
                    const valid = validate(parsed);
                    if (!valid) {
                         console.error('DID JSON invalid:', validate.errors);
                         return { success: false, errors: `DID JSON invalid: ${JSON.stringify(validate.errors)}` };
                    }
                    console.log('DID JSON valid');
               }

               // Convert JSON to hex
               const didDataHex = this.jsonToHex(parsed as object);
               console.log('didDataHex in json', this.hexTojson(didDataHex));
               return { success: true, hexData: didDataHex };
          } catch (e: any) {
               console.error('Invalid JSON:', e.message);
               return { success: false, errors: `Invalid JSON: ${e.message}` };
          }
     }

     updateAmount(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.txUiService.amountField.set('');
               return;
          }

          // Round to 6 decimal places (XRP precision)
          const rounded = Number(num.toFixed(6));
          this.txUiService.amountField.set(rounded.toString());
     }

     updateTrustlineLimitAmount(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.txUiService.trustlineLimitField.set(0);
               return;
          }

          // Round to 6 decimal places (XRP precision)
          const rounded = Number(num.toFixed(10));
          this.txUiService.trustlineLimitField.set(rounded);
     }

     issuedAmount(currency: string, issuer: string, value: any) {
          return { currency, issuer, value: value.toString() };
     }

     convertXRPLTime(rippleTime: any) {
          const cancelAfterUnix = rippleTime + AppConstants.RIPPLE_EPOCH_OFFSET; // 1757804253

          const cancelAfterDate = new Date(cancelAfterUnix * 1000);
          const formatter1 = this.dateFormatter();
          return formatter1.format(cancelAfterDate);
     }

     convertToUnixTimestamp(dateString: any) {
          const [month, day, year] = dateString.split('/').map(Number);
          const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
          return Math.floor(date.getTime() / 1000);
     }

     isRippleExpired(rippleTime?: number): boolean {
          if (!rippleTime) return false;
          return Date.now() > (rippleTime + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000;
     }

     toRippleTime(isoDate: string): number {
          // Ripple epoch starts 2000-01-01T00:00:00Z
          const rippleEpoch = Date.UTC(2000, 0, 1, 0, 0, 0);

          // Parse the input date
          const inputDate = new Date(isoDate).getTime();

          // Convert ms → seconds and subtract epoch
          return Math.floor((inputDate - rippleEpoch) / 1000);
     }

     fromRippleTime(rippleTime: number): { isoUTC: string; est: string } {
          // Ripple epoch starts 2000-01-01T00:00:00Z
          const rippleEpoch = Date.UTC(2000, 0, 1, 0, 0, 0);

          // Convert ripple seconds back to JS time
          const date = new Date(rippleEpoch + rippleTime * 1000);

          // ISO UTC string
          const isoUTC = date.toISOString();

          // EST (America/New_York) using 12-hour clock
          const est = new Intl.DateTimeFormat('en-US', {
               timeZone: 'America/New_York',
               year: 'numeric',
               month: '2-digit',
               day: '2-digit',
               hour: '2-digit',
               minute: '2-digit',
               second: '2-digit',
               hour12: true,
          }).format(date);

          return { isoUTC, est };
     }

     // Returns ripple-epoch seconds (number) or undefined if empty/invalid
     getExpirationRippleSeconds(credential: String): number | undefined {
          const v = credential;
          if (!v) return undefined;

          // If ngModel gave a Date object, convert to Y/M/D safely:
          if (v instanceof Date) {
               const y = v.getFullYear();
               const m = v.getMonth() + 1;
               const d = v.getDate();
               const unixSeconds = Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000);
               return unixSeconds - AppConstants.RIPPLE_EPOCH_OFFSET;
          }

          // If it's a string (YYYY-MM-DD) — the normal case for <input type="date">
          if (typeof v === 'string') {
               const parts = v.split('-').map(Number);
               if (parts.length !== 3 || parts.some(Number.isNaN)) {
                    throw new Error('expirationDate must be YYYY-MM-DD or Date');
               }
               const [year, month, day] = parts;
               const unixSeconds = Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0) / 1000);
               return unixSeconds - AppConstants.RIPPLE_EPOCH_OFFSET;
          }

          throw new Error('Unsupported expirationDate type: ' + typeof v);
     }

     decodeHex = (hex: any): string => {
          try {
               if (!this.validateInput(hex)) {
                    return '';
               }
               return Buffer.from(hex, 'hex').toString('ascii');
          } catch (error: any) {
               console.error(`Error decoding hex: ${hex}`, error);
               return hex; // Return raw hex if decoding fails
          }
     };

     // Helper: safely decode hex strings
     private decodeutf8Hex(hex: string | undefined): string {
          if (!hex) return 'N/A';
          try {
               return Buffer.from(hex, 'hex').toString('utf8') || 'N/A';
          } catch {
               return 'Invalid Hex';
          }
     }

     formatIssuer(issuer?: string): string {
          if (!issuer) return '';
          return `${issuer.slice(0, 6)}...${issuer.slice(-6)}`;
     }

     getCredentialColor(credential: any): string {
          const type = credential?.CredentialType;
          if (type.includes('kyc') || type.includes('KYC')) return 'green';
          if (type.includes('member')) return '#007bff';
          if (type.includes('compliance') || type.includes('Compliance')) return 'orange';
          if (type.includes('admin') || type.includes('Admin')) return 'red';
          return '#333';
     }

     async getRegularKeyWallet(isMultiSign: boolean, regularKeyAddress: string, isRegularKeyAddress: boolean, regularKeySeed: string) {
          let regularKeyWalletSignTx: any = '';
          let useRegularKeyWalletSignTx = false;
          if (isRegularKeyAddress && !isMultiSign) {
               console.log('Using Regular Key Seed for transaction signing');
               regularKeyWalletSignTx = await this.getWalletWithEncryptionAlgorithm(regularKeySeed, 'ed25519');
               if (regularKeyAddress !== regularKeyWalletSignTx.classicAddress) {
                    regularKeyWalletSignTx = await this.getWalletWithEncryptionAlgorithm(regularKeySeed, 'secp256k1');
               }
               console.log('Wallet:', regularKeyWalletSignTx);
               useRegularKeyWalletSignTx = true;
          }
          return { useRegularKeyWalletSignTx, regularKeyWalletSignTx };
     }

     getMultiSignSeeds(multiSignSeeds: any) {
          return multiSignSeeds
               .split(',')
               .map((s: string) => s.trim())
               .filter((s: string) => s.length > 0 && s !== '');
     }

     getMultiSignAddress(multiSignAddress: any) {
          return multiSignAddress
               .split(',')
               .map((s: string) => s.trim())
               .filter((s: string) => s.length > 0 && s !== '');
     }

     getNftIds(nftId: any) {
          return nftId
               .split(',')
               .map((s: string) => s.trim())
               .filter((s: string) => s.length > 0 && s !== '');
     }

     formatTokenBalance(field: string, roundTo: number): string {
          return Number(field).toLocaleString(undefined, {
               minimumFractionDigits: 0,
               maximumFractionDigits: roundTo, // enough to preserve precision
               useGrouping: true,
          });
     }

     removeCommaFromAmount(field: string): string {
          return field.replaceAll(',', '');
     }

     normalizeMnemonic(input: string): string {
          return (
               input
                    // .toLowerCase()
                    // .replaceAll(',', '') // remove commas
                    .replaceAll(/\s+/g, ' ') // normalize spacing
                    .trim()
          );
     }

     normalizeMnemonic1(input: string): string {
          const normalized = input.trim().toLowerCase();

          if (!/^[a-z]+( [a-z]+)*$/.test(normalized)) {
               return 'Invalid Mnemonic. Must contain lowercase words separated by single spaces only.';
          }

          if (!bip39.validateMnemonic(normalized)) {
               return 'Invalid BIP39 Mnemonic.';
          }

          return normalized;
     }

     normalizeSecrets(input: string): string[] {
          return input
               .split(/[\s,]+/)
               .map(s => s.trim())
               .filter(Boolean);
     }

     normalizeFamilySeed(input: string): string {
          if (!input) return '';

          return input
               .trim()
               .replaceAll(/\s+/g, '') // remove all spaces (including pasted line breaks)
               .replaceAll(/[\u200B-\u200D\uFEFF]/g, ''); // remove invisible unicode chars
     }

     isValidSecret(secrets: string[]): boolean {
          const valid: string[] = [];
          const invalid: string[] = [];

          for (const secret of secrets) {
               if (this.isValidSecretNumber(secret.trim())) {
                    valid.push(secret);
               } else {
                    invalid.push(secret);
               }
          }

          if (invalid.length > 0 || valid.length != 8) {
               return false;
          }
          return true;
     }

     isValidMnemonic(mnemonic: string): boolean {
          const cleaned = this.normalizeMnemonic(mnemonic);
          const words = cleaned.split(' ');

          // Basic structural validation (24 words, alphabetic only)
          if (words.length !== 24) return false;

          return words.every(word => /^[a-z]+$/.test(word));
     }

     isValidSecretNumber(secret: string): boolean {
          return /^\d{6}$/.test(secret);
     }

     convertSecretNumberStringToArray(rawSecrets: string) {
          return rawSecrets
               .split(',')
               .map(s => s.trim())
               .filter(s => s.length > 0);
     }

     async getWalletFromAddress(address: string): Promise<xrpl.Wallet> {
          const walletData = this.walletManagerService.wallets().find(w => w.address === address || (w.classicAddress && w.classicAddress === address));

          if (!walletData?.seed) {
               throw new Error(`Wallet seed not found for address: ${address}`);
          }

          const algStr = (walletData.encryptionAlgorithm || 'ed25519') as 'ed25519' | 'secp256k1';
          // Map string algorithm to xrpl.ECDSA enum when needed; leave undefined for Ed25519 to use default
          const options: { algorithm?: xrpl.ECDSA } = {};
          if (algStr === 'secp256k1') {
               options.algorithm = xrpl.ECDSA.secp256k1;
          }

          return xrpl.Wallet.fromSeed(walletData.seed, options);
     }

     formatCurrencyForDisplay(v: any): string {
          const strV = String(v);
          const normalizedCurrency = this.normalizeCurrencyCode(strV);
          if (normalizedCurrency === '') {
               return `(LP Token) ${strV}`;
          } else {
               return `${normalizedCurrency}`;
          }
     }

     formatValueForKey(k: string, v: any): string {
          const strV = String(v);
          if (k === 'index' || k === 'Account' || k === 'issuer') {
               return `<code>${strV}</code>`;
          }
          if (k === 'currency') {
               const normalizedCurrency = this.normalizeCurrencyCode(strV);
               if (normalizedCurrency === '') {
                    return `(LP Token) <code>${strV}</code>`;
               } else {
                    return `<code>${normalizedCurrency}</code>`;
               }
          }
          return strV;
     }

     /**
      * Converts an XRPL InvoiceID (hex string) to human-readable text if possible.
      * Falls back to truncated hex if not valid UTF-8.
      */
     formatInvoiceId(invoiceIdHex: string | undefined): string {
          if (!invoiceIdHex || invoiceIdHex.length !== 64) {
               return '—';
          }

          try {
               // Convert hex to Uint8Array
               const bytes = new Uint8Array(invoiceIdHex.match(/.{1,2}/g)!.map(byte => Number.parseInt(byte, 16)));

               // Try to decode as UTF-8
               const decoder = new TextDecoder('utf-8', { fatal: true });
               const text = decoder.decode(bytes);

               // If decoding succeeds and contains printable chars, return it
               if (/[\w\d\s\-\.\,\!\@\#\$\%\^\&\*\(\)]/.test(text)) {
                    const trimmed = text.trim();
                    return trimmed || invoiceIdHex.slice(0, 16) + '...';
               }
          } catch (e) {
               // Not valid UTF-8 → fall through
          }

          // Fallback: show truncated hex
          return invoiceIdHex.slice(0, 12) + '...' + invoiceIdHex.slice(-8);
     }

     normalizeAccounts(accounts: Record<string, string>, newAddress: string): Record<string, string> {
          // Check if all non-XRP keys are already set to newAddress
          const alreadyNormalized = Object.entries(accounts)
               .filter(([key]) => key !== 'XRP')
               .every(([, value]) => value === newAddress);

          if (alreadyNormalized) {
               accounts['XRP'] = '';
               return accounts; // Nothing to change
          }

          // Update all non-XRP keys to newAddress
          const updated = { ...accounts };
          for (const key in updated) {
               if (key !== 'XRP') {
                    updated[key] = newAddress;
               }
          }
          accounts['XRP'] = '';
          return updated;
     }

     isValidCurrencyCode(currency: string): boolean {
          // Basic validation: 3-20 characters or valid hex for XRPL currency codes
          return /^[A-Za-z0-9]{3,20}$/.test(currency) || /^[0-9A-Fa-f]{40}$/.test(currency);
     }

     normalizeCurrencyCode(currencyCode: string, maxLength = 20) {
          if (!currencyCode) return '';

          if (currencyCode.length === 3 && currencyCode.trim().toLowerCase() !== 'xrp') {
               // "Standard" currency code
               return currencyCode.trim();
          }

          if (new RegExp(/^[a-fA-F0-9]{40}$/).exec(currencyCode) && !Number.isNaN(Number.parseInt(currencyCode, 16))) {
               // Hexadecimal currency code
               const hex = currencyCode.toString().replaceAll(/(00)+$/g, '');
               if (hex.startsWith('01')) {
                    // Old demurrage code. https://xrpl.org/demurrage.html
                    return this.convertDemurrageToUTF8(currencyCode);
               }
               if (hex.startsWith('02')) {
                    // XLS-16d NFT Metadata using XLS-15d Concise Transaction Identifier
                    // https://github.com/XRPLF/XRPL-Standards/discussions/37
                    const xlf15d = Buffer.from(hex, 'hex').slice(8).toString('utf-8').slice(0, maxLength).trim();
                    if (new RegExp(/[a-zA-Z0-9]{3,}/).exec(xlf15d) && xlf15d.toLowerCase() !== 'xrp') {
                         return xlf15d;
                    }
               }
               if (hex.startsWith('03')) {
                    return 'LP Token ' + hex;
               }
               const decodedHex = Buffer.from(hex, 'hex').toString('utf-8').slice(0, maxLength).trim();
               if (new RegExp(/[a-zA-Z0-9]{3,}/).exec(decodedHex) && decodedHex.toLowerCase() !== 'xrp') {
                    // ASCII or UTF-8 encoded alphanumeric code, 3+ characters long
                    return decodedHex;
               }
          }

          if (currencyCode.length > 3) {
               return this.encodeIfNeeded(currencyCode);
          }
          return '';
     }

     convertDemurrageToUTF8(demurrageCode: string): string {
          let bytes = Buffer.from(demurrageCode, 'hex');
          let code = String.fromCharCode(bytes[1]) + String.fromCharCode(bytes[2]) + String.fromCharCode(bytes[3]);
          let interest_start = (bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7];
          let interest_period = bytes.readDoubleBE(8);
          const year_seconds = 31536000; // By convention, the XRP Ledger's interest/demurrage rules use a fixed number of seconds per year (31536000), which is not adjusted for leap days or leap seconds
          let interest_after_year = Math.pow(Math.E, (interest_start + year_seconds - interest_start) / interest_period);
          let interest = interest_after_year * 100 - 100;

          return `${code} (${interest}% pa)`;
     }

     decodeCurrencyCode(hexCode: String) {
          const buffer = Buffer.from(hexCode, 'hex');
          const trimmed = buffer.subarray(0, buffer.findIndex(byte => byte === 0) === -1 ? 20 : buffer.findIndex(byte => byte === 0));
          return new TextDecoder().decode(trimmed);
     }

     encodeCurrencyCode(code: any) {
          const encoder = new TextEncoder();
          const codeBytes = encoder.encode(code);

          if (codeBytes.length > 20) throw new Error('Currency code too long');

          // Pad to 20 bytes
          const padded = new Uint8Array(20);
          padded.set(codeBytes);

          return Buffer.from(padded).toString('hex').toUpperCase(); // 40-char hex string
     }

     isRippleState(obj: any): obj is RippleState {
          return obj?.LedgerEntryType === 'RippleState';
     }

     isMPT(obj: any): obj is MPToken {
          return obj?.LedgerEntryType === 'MPToken';
     }

     decodeNFTFlags(flags: any) {
          if (typeof flags !== 'number') return '';

          const flagMap = {
               1: 'Burnable',
               2: 'Only XRP',
               8: 'Transferable',
               16: 'Mutable',
          };

          const result = [];
          for (const [bit, name] of Object.entries(flagMap)) {
               if (flags & Number(bit)) result.push(name);
          }

          return result.length ? result.join(', ') : 'None';
     }

     getCredentialStatus(flags: number): string {
          return flags === 65536 ? 'Credential accepted' : 'Credential not accepted';
     }

     parseTransferRateToPercentage(transferRate: string) {
          const rate = Number.parseInt(transferRate, 10);
          if (Number.isNaN(rate) || rate < 1000000000) {
               return 0; // Default rate is 0% fee (1.0x multiplier)
          }
          return (rate / 1_000_000_000 - 1) * 100;
     }

     convertToEstTime(UtcDataTime: string): string {
          const utcDate = new Date(UtcDataTime);
          const formatter = this.dateFormatter();
          return formatter.format(utcDate);
     }

     toLocalDateTimeString(date: Date): string {
          const pad = (n: number) => n.toString().padStart(2, '0');

          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
     }

     dateFormatter() {
          // Format the date in EST (America/New_York handles EST/EDT automatically)
          return new Intl.DateTimeFormat('en-US', {
               timeZone: 'America/New_York', // EST/EDT
               timeZoneName: 'short', // Includes EST or EDT
               year: 'numeric',
               month: 'numeric',
               day: 'numeric', // day: '2-digit',
               hour: 'numeric', // hour: '2-digit',
               minute: '2-digit',
               second: '2-digit',
               hour12: true, // Use 24-hour format; set to true for 12-hour with AM/PM
               // fractionalSecondDigits: 3, // Include milliseconds (3 digits)
          });
     }

     convertDateTimeToRippleTime(dateTimeField: string) {
          const date = new Date(dateTimeField); // parses as local time
          const unixTimestamp = Math.floor(date.getTime() / 1000); // milliseconds ➜ seconds
          const afterDate = unixTimestamp - AppConstants.RIPPLE_EPOCH_OFFSET;
          console.log('XRPL CancelAfter:', afterDate);
          return afterDate;
     }

     addTime(amount: any, unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'seconds', date = new Date()) {
          const multiplierMap = {
               seconds: 1,
               minutes: 60,
               hours: 3600,
               days: 86400,
          };

          const multiplier = multiplierMap[unit];
          if (!multiplier) {
               throw new Error(`Invalid unit: ${unit}. Use 'seconds', 'minutes', 'hours', or 'days'.`);
          }

          const addedSeconds = amount * multiplier;
          const unixTimestamp = Math.floor(date.getTime() / 1000) + addedSeconds;

          // Convert from Unix Epoch (1970) to Ripple Epoch (2000)
          const rippleEpoch = unixTimestamp - AppConstants.RIPPLE_EPOCH_OFFSET;
          return rippleEpoch;
     }

     setDateTimeFieldToNow() {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
     }

     addToDateTimeField(fieldSignal: Signal<string>, writableSignal: WritableSignal<string>, seconds: number): void {
          let currentValue = fieldSignal();

          // If field is empty, start from now
          if (!currentValue) {
               const now = new Date();
               currentValue = this.formatDateTimeLocal(now);
          }

          const date = new Date(currentValue);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          writableSignal.set(newDateTime);
     }

     formatDateTimeLocal(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const secs = String(date.getSeconds()).padStart(2, '0');

          return `${year}-${month}-${day}T${hours}:${minutes}:${secs}`;
     }

     // getTransferRate(percentage: number): number {
     //      // Placeholder: Implement your getTransferRate from utils.js
     //      // Example: Convert percentage to XRPL TransferRate
     //      return Math.round((1 + percentage / 100) * 1_000_000_000);
     // }

     stripHTMLForSearch(html: string): string {
          const div = document.createElement('div');
          div.innerHTML = html;
          const result = (div.textContent || div.innerText || '').toLowerCase().trim();
          console.debug('stripHTMLForSearch:', { input: html, output: result });
          return result;
     }

     stripHTML(text: string): string {
          const div = document.createElement('div');
          div.innerHTML = text;
          return div.textContent || div.innerText || '';
     }

     async getWalletWithEncryptionAlgorithm(seed: string, algorithm: 'ed25519' | 'secp256k1'): Promise<xrpl.Wallet> {
          const result = this.detectXrpInputType(seed);

          // Map string algorithm to xrpl's expected type (ECDSA enum or undefined)
          const options: { algorithm?: xrpl.ECDSA } = {};
          if (algorithm === 'secp256k1') {
               options.algorithm = xrpl.ECDSA.secp256k1;
          } else {
               options.algorithm = xrpl.ECDSA.ed25519;
          }

          // For 'ed25519', leave algorithm undefined (xrpl defaults to Ed25519)
          try {
               if (result.type === 'seed') {
                    return xrpl.Wallet.fromSeed(result.value, options);
               } else if (result.type === 'mnemonic') {
                    // Use Wallet.fromMnemonic (assuming it's a static method like fromSeed)
                    return xrpl.Wallet.fromMnemonic(result.value, options);
               } else if (result.type === 'secret_numbers') {
                    // Assuming walletFromSecretNumbers is imported/available; adjust if needed
                    return walletFromSecretNumbers(result.value, options);
               } else {
                    throw new Error('Invalid input format');
               }
          } catch (error: any) {
               console.error(`Error getting wallet with encryption ${error.message}`);
               throw new Error('Invalid input or algorithm mismatch');
          }
     }

     async getWallet(seed: string): Promise<xrpl.Wallet> {
          const savedEncryptionType = this.storageService.getInputValue('encryptionType');
          const result = this.detectXrpInputType(seed);
          try {
               if (savedEncryptionType === 'ed25519') {
                    if (result.type === 'seed') {
                         return xrpl.Wallet.fromSeed(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    } else if (result.type === 'mnemonic') {
                         return Wallet.fromMnemonic(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    } else if (result.type === 'secret_numbers') {
                         return walletFromSecretNumbers(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    } else {
                         throw new Error('Invalid seed or mnemonic format');
                    }
               } else {
                    if (result.type === 'seed') {
                         return xrpl.Wallet.fromSeed(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    } else if (result.type === 'mnemonic') {
                         return Wallet.fromMnemonic(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    } else if (result.type === 'secret_numbers') {
                         return walletFromSecretNumbers(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    } else {
                         throw new Error('Invalid seed or mnemonic format');
                    }
               }
          } catch (error: any) {
               console.error(`Invalid seed or mnemonic format ${error.message}`);
               throw new Error('Invalid seed or mnemonic format');
          }
     }

     validateSeed(seed: string) {
          const savedEncryptionType = this.storageService.getInputValue('encryptionType');
          const result = this.detectXrpInputType(seed);
          try {
               if (result.type === 'unknown') {
                    return false;
               }
               if (savedEncryptionType === 'ed25519') {
                    if (result.type === 'seed') {
                         xrpl.Wallet.fromSeed(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    } else if (result.type === 'mnemonic') {
                         Wallet.fromMnemonic(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    } else if (result.type === 'secret_numbers') {
                         walletFromSecretNumbers(result.value, { algorithm: AppConstants.ENCRYPTION.ED25519 });
                    }
               } else {
                    if (result.type === 'seed') {
                         xrpl.Wallet.fromSeed(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    } else if (result.type === 'mnemonic') {
                         Wallet.fromMnemonic(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    } else if (result.type === 'secret_numbers') {
                         walletFromSecretNumbers(result.value, { algorithm: AppConstants.ENCRYPTION.SECP256K1 });
                    }
               }
               return true;
          } catch (error: any) {
               console.error(`Error validation seed ${error.message}`);
               return false;
          }
     }

     detectXrpInputType(input: string): { type: InputType; value: string } {
          let trimmed = '';
          if (!input) {
               return { type: 'unknown', value: trimmed };
          }
          try {
               trimmed = input.trim();

               // Check for valid XRPL seed (family seed)
               const seedRegex = /^s[0-9A-Za-z]{20,}$/;
               if (seedRegex.test(trimmed) && xrpl.isValidSecret(trimmed)) {
                    return { type: 'seed', value: trimmed };
               }

               // Check for mnemonic (12-24 lowercase words)
               const mnemonicWords = trimmed.split(/\s+/);
               const isAllWords = mnemonicWords.every(word => /^[a-z]+$/.test(word));
               if (isAllWords && [12, 15, 18, 21, 24].includes(mnemonicWords.length)) {
                    return { type: 'mnemonic', value: trimmed };
               }

               // Check for "secret numbers" (comma-separated 6-digit parts)
               const numberParts = trimmed.split(',');
               const isAllNumbers = numberParts.every(num => /^\d{6}$/.test(num.trim()));
               if (isAllNumbers && numberParts.length > 1) {
                    return { type: 'secret_numbers', value: trimmed };
               }

               // Final fallback
               return { type: 'unknown', value: trimmed };
          } catch (error: any) {
               console.error('Error in detectXrpInputType', error);
               return { type: 'unknown', value: trimmed };
          }
     }

     checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse): any {
          let signerQuorum;
          const signerAccounts: string[] = [];

          const accountObjectsArray = accountObjects.result?.account_objects;
          if (!Array.isArray(accountObjectsArray)) return [];

          for (const obj of accountObjectsArray) {
               if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                    // Set quorum once
                    if (obj.SignerQuorum !== undefined) {
                         signerQuorum = obj.SignerQuorum;
                    }

                    for (const entry of obj.SignerEntries) {
                         const account = entry.SignerEntry?.Account;
                         if (account) {
                              signerAccounts.push(`${account}~${entry.SignerEntry.SignerWeight ?? ''}`);
                         }
                    }
               }
          }

          return { signerAccounts, signerQuorum };
     }

     getAccountTickets(accountObjects: xrpl.AccountObjectsResponse): string[] {
          const objects = accountObjects.result?.account_objects;
          if (!Array.isArray(objects)) return [];

          const tickets = objects.reduce((acc: number[], obj) => {
               if (obj.LedgerEntryType === 'Ticket' && typeof obj.TicketSequence === 'number') {
                    acc.push(obj.TicketSequence);
               }
               return acc;
          }, []);

          return tickets.sort((a, b) => a - b).map(String);
     }

     setRegularKeyProperties(regularKey: string | undefined, account: string): any {
          if (regularKey) {
               const regularKeyAddress = regularKey;
               const regularKeySeed = this.storageService.get(`${account}regularKeySeed`) || '';
               const isRegularKeyAddress = true;
               return { regularKeyAddress, regularKeySeed, isRegularKeyAddress };
          }
          this.storageService.removeValue(`${account}regularKeySeed`);
     }

     validateQuorum(signers: any, signerQuorum: any) {
          const totalWeight = signers.reduce((sum: any, s: { weight: any }) => sum + (s.weight || 0), 0);
          if (signerQuorum > totalWeight) {
               return totalWeight;
          }
     }

     async toggleUseMultiSign(multiSignAddress: string, multiSignSeeds: string) {
          if (multiSignAddress === 'No Multi-Sign address configured for account') {
               multiSignSeeds = '';
               return { multiSignSeeds };
          }
          return null;
     }

     onTicketToggle(event: any, ticket: string, selectedTickets: any) {
          if (event.target.checked) {
               selectedTickets = [...selectedTickets, ticket];
          } else {
               selectedTickets = selectedTickets.filter((t: string) => t !== ticket);
          }
          return selectedTickets;
     }

     async toggleMultiSign(useMultiSign: boolean, signers: any, walletClassicAddress: string) {
          try {
               if (useMultiSign) {
                    this.loadSignerList(walletClassicAddress, signers);
               } else {
                    this.clearSignerList(signers);
               }
          } catch (error: any) {
               throw new Error(`Error getting wallet in toggleMultiSign' ${error.message}`);
          }
     }

     cleanUpMultiSelection(selectedTickets: any, ticketArray: any) {
          // Filter out any selected tickets that no longer exist
          return selectedTickets.filter((ticket: any) => ticketArray.includes(ticket));
     }

     isTxResponse(obj: any): obj is xrpl.TxResponse<xrpl.SubmittableTransaction> {
          return obj && typeof obj !== 'string' && 'result' in obj;
     }

     isTxSuccessful(response: any): boolean {
          // Handle submitAndWait response (real transaction)
          if (response?.result?.meta) {
               if (typeof response.result.meta === 'string') {
                    // Meta is string? That's an error
                    return false;
               }
               // Check TransactionResult
               return response.result.meta.TransactionResult === AppConstants.TRANSACTION.TES_SUCCESS;
          }

          // Handle submit response (simulate)
          if (response?.engine_result) {
               return response.engine_result === 'tesSUCCESS';
          }

          // Handle error responses from submit
          if (response?.result?.engine_result) {
               return response.result.engine_result === 'tesSUCCESS';
          }

          // Handle unexpected/unknown response
          console.warn('Unknown response format in isTxSuccessful:', response);
          return false;
     }

     getTransactionResultMessage(response: any): string {
          if (response?.result?.meta?.TransactionResult) {
               return response.result.meta.TransactionResult;
          }
          if (response?.engine_result) {
               return response.engine_result;
          }
          if (response?.result?.engine_result) {
               return response.result.engine_result;
          }
          return 'UNKNOWN';
     }

     processErrorMessageFromLedger(resultMsg: string): string {
          // =============================
          // LOCAL FAILURE (tef*)
          // Transaction failed before applying to ledger
          // =============================
          if (resultMsg === 'tefALREADY') return 'Transaction already applied or queued.';
          if (resultMsg === 'tefBAD_ADD_AUTH') return 'Invalid addition to signer list.';
          if (resultMsg === 'tefBAD_AUTH') return 'Invalid signature or authorization.';
          if (resultMsg === 'tefBAD_AUTH_MASTER') return 'Master key is disabled and no regular key set.';
          if (resultMsg === 'tefBAD_LEDGER') return 'Ledger state is invalid or inconsistent.';
          if (resultMsg === 'tefCREATED') return 'Object created that should not be created.';
          if (resultMsg === 'tefEXCEPTION') return 'Unexpected exception during processing.';
          if (resultMsg === 'tefFAILURE') return 'Generic failure during local processing.';
          if (resultMsg === 'tefINTERNAL') return 'Internal error in rippled server.';
          if (resultMsg === 'tefMAX_LEDGER') return 'Transaction expired. Please try again.';
          if (resultMsg === 'tefNO_AUTH_REQUIRED') return 'Auth is required but not provided.';
          if (resultMsg === 'tefPAST_SEQ') return 'Sequence number is too low (already used).';
          if (resultMsg === 'tefWRONG_PRIOR') return 'Incorrect previous transaction hash.';
          if (resultMsg === 'tefMASTER_DISABLED') return 'Master key is disabled and no regular key available.';

          // =============================
          // CLAIM FAILURE (tec*)
          // Transaction claimed a fee but failed to apply
          // =============================
          if (resultMsg === 'tecCLAIM') return 'Fee claimed, but transaction failed.';
          if (resultMsg === 'tecDIR_FULL') return 'Directory is full. Try again later.';
          if (resultMsg === 'tecFAILED_PROCESSING') return 'Transaction failed during processing.';
          if (resultMsg === 'tecINSUF_RESERVE_LINE') return 'Insufficient reserve to add trust line.';
          if (resultMsg === 'tecINSUF_RESERVE_OFFER') return 'Insufficient reserve to create offer.';
          if (resultMsg === 'tecNO_DST') return 'Destination account does not exist.';
          if (resultMsg === 'tecNO_DST_INSUF_XRP') return 'Destination account does not exist and cannot be created (insufficient XRP).';
          if (resultMsg === 'tecNO_ISSUER') return 'Issuer account does not exist.';
          if (resultMsg === 'tecNO_AUTH') return 'Not authorized to hold asset (trust line not authorized).';
          if (resultMsg === 'tecNO_LINE') return 'No trust line exists for this asset.';
          if (resultMsg === 'tecNO_LINE_INSUF_RESERVE') return 'No trust line and insufficient reserve to create one.';
          if (resultMsg === 'tecNO_LINE_REDUNDANT') return 'Trust line already exists with same limit.';
          if (resultMsg === 'tecPATH_DRY') return 'No liquidity found along payment path.';
          if (resultMsg === 'tecPATH_PARTIAL') return 'Only partial payment possible.';
          if (resultMsg === 'tecUNFUNDED_ADD') return 'Insufficient funds to add to balance.';
          if (resultMsg === 'tecUNFUNDED_OFFER') return 'Insufficient funds to place offer.';
          if (resultMsg === 'tecUNFUNDED_PAYMENT') return 'Insufficient balance to complete transaction.';
          if (resultMsg === 'tecOWNERS') return 'Cannot modify object with existing owners (e.g. disable account with trust lines/offers).';
          if (resultMsg === 'tecOVERSIZE') return 'Transaction is too large.';
          if (resultMsg === 'tecCRYPTOCONDITION_ERROR') return 'Cryptocondition validation failed.';
          if (resultMsg === 'tecEXPIRED') return 'Transaction or object has expired.';
          if (resultMsg === 'tecDUPLICATE') return 'Transaction is duplicate or conflicts with existing one.';
          if (resultMsg === 'tecKILLED') return 'Offer or object was killed (e.g., expired/cancelled).';
          if (resultMsg === 'tecHAS_OBLIGATIONS') return 'Action cannot be executed — still has obligations (issued tokens).';
          if (resultMsg === 'tecTOO_SOON') return 'Too soon to perform this action (e.g., clawback cooldown).';

          // =============================
          // FAILURE (ter*)
          // Retry might succeed
          // =============================
          if (resultMsg === 'terRETRY') return 'Temporary failure. Please retry transaction.';
          if (resultMsg === 'terQUEUED') return 'Transaction queued for future processing.';
          if (resultMsg === 'terPRE_SEQ') return 'Sequence number is too high (future sequence).';
          if (resultMsg === 'terLAST') return 'Transaction is last in queue — retry may help.';

          // =============================
          // BAD INPUT (tem*)
          // Malformed transaction
          // =============================
          if (resultMsg === 'temBAD_AMOUNT') return 'Invalid amount specified.';
          if (resultMsg === 'temBAD_CURRENCY') return 'Invalid currency code.';
          if (resultMsg === 'temBAD_EXPIRATION') return 'Invalid expiration time.';
          if (resultMsg === 'temBAD_FEE') return 'Invalid transaction fee.';
          if (resultMsg === 'temBAD_ISSUER') return 'Invalid issuer address.';
          if (resultMsg === 'temBAD_LIMIT') return 'Invalid limit amount.';
          if (resultMsg === 'temBAD_OFFER') return 'Invalid offer.';
          if (resultMsg === 'temBAD_PATH') return 'Invalid payment path.';
          if (resultMsg === 'temBAD_PATH_LOOP') return 'Payment path contains loop.';
          if (resultMsg === 'temBAD_QUANTITY') return 'Invalid quantity.';
          if (resultMsg === 'temBAD_SEND_XRP_LIMIT') return 'XRP send limit exceeded.';
          if (resultMsg === 'temBAD_SEND_XRP_MAX') return 'Maximum XRP send exceeded.';
          if (resultMsg === 'temBAD_SEND_XRP_NO_DIRECT') return 'No direct XRP send allowed.';
          if (resultMsg === 'temBAD_SEND_XRP_PARTIAL') return 'Partial XRP send not allowed.';
          if (resultMsg === 'temBAD_SEND_XRP_SRC_TAG') return 'Source tag not allowed for XRP send.';
          if (resultMsg === 'temBAD_SEQUENCE') return 'Invalid sequence number.';
          if (resultMsg === 'temBAD_SIGNATURE') return 'Invalid signature.';
          if (resultMsg === 'temBAD_SRC_ACCOUNT') return 'Invalid source account.';
          if (resultMsg === 'temBAD_TRANSFER_RATE') return 'Invalid transfer rate.';
          if (resultMsg === 'temDST_IS_SRC') return 'Destination cannot be same as source.';
          if (resultMsg === 'temDST_NEEDED') return 'Destination account required.';
          if (resultMsg === 'temINVALID') return 'Transaction is malformed or invalid.';
          if (resultMsg === 'temINVALID_FLAG') return 'Invalid flag combination.';
          if (resultMsg === 'temREDUNDANT') return 'Redundant transaction (no change).';
          if (resultMsg === 'temRIPPLE_EMPTY') return 'Ripple state is empty.';
          if (resultMsg === 'temDISABLED') return 'Feature is disabled.';
          if (resultMsg === 'temBAD_SIGNER') return 'Invalid signer or quorum.';

          // =============================
          // SUCCESS (tes*)
          // =============================
          if (resultMsg === 'tesSUCCESS') return ''; // No error message needed

          // =============================
          // UNKNOWN / UNSPECIFIED
          // =============================
          return ` (Code: ${resultMsg})`;
     }

     async handleMultiSignTransaction({ client, wallet, tx, signerAddresses, signerSeeds, fee }: { client: xrpl.Client; wallet: xrpl.Wallet; tx: xrpl.Transaction; signerAddresses: string[]; signerSeeds: string[]; fee: string }): Promise<{ signedTx: { tx_blob: string; hash: string } | null; signers: xrpl.Signer[] }> {
          const accountObjects = await this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '');

          const signerList = accountObjects.result.account_objects.find((obj: any) => obj.LedgerEntryType === 'SignerList');
          if (!signerList) {
               throw new Error('Account does not have a SignerList');
          }

          // Optional: prevent duplicates
          const uniqueSigners = new Set(signerAddresses);
          if (uniqueSigners.size !== signerAddresses.length) {
               throw new Error('Duplicate signer addresses are not allowed');
          }

          if (!Array.isArray((signerList as any).SignerEntries)) {
               throw new Error('SignerList object does not have valid SignerEntries');
          }

          if (!('SignerEntries' in signerList) || !Array.isArray((signerList as any).SignerEntries)) {
               throw new Error('SignerList object does not have SignerEntries');
          }

          const validSigners = (signerList as { SignerEntries: any[] }).SignerEntries.map((entry: any) => entry.SignerEntry.Account);

          if (signerAddresses.some(addr => !validSigners.includes(addr))) {
               throw new Error('One or more signer addresses are not in the SignerList');
          }

          const quorum = (signerList as any).SignerQuorum;

          let totalWeight = 0;
          signerAddresses.forEach(addr => {
               const signerEntry = (signerList as any).SignerEntries.find((entry: any) => entry.SignerEntry.Account === addr);
               if (signerEntry) {
                    totalWeight += signerEntry.SignerEntry.SignerWeight;
               }
          });

          if (totalWeight < quorum) {
               throw new Error(`Signer weight (${totalWeight}) is less than required quorum (${quorum})`);
          }

          console.log('SignerList:', signerList);
          console.log('Valid Signers:', validSigners);
          console.log('Provided Signers:', signerAddresses);
          console.log('Quorum:', quorum);

          // Adjust fee based on number of signers
          const feeDrops = Number(fee) * (1 + signerAddresses.length);
          tx.Fee = String(feeDrops);
          tx.SigningPubKey = '';

          const preparedTx = await client.autofill({
               ...tx,
               SigningPubKey: '',
          } as xrpl.SubmittableTransaction);

          delete preparedTx.Signers;
          delete preparedTx.TxnSignature;

          console.log('PreparedTx before signing:', preparedTx);

          const signerBlobs: string[] = [];

          for (let i = 0; i < signerAddresses.length; i++) {
               let signerWallet = await this.getWalletWithEncryptionAlgorithm(signerSeeds[i], 'secp256k1');

               if (signerWallet.classicAddress !== signerAddresses[i]) {
                    console.log('Seed mismatch with secp256k1. Trying ed25519');
                    signerWallet = await this.getWalletWithEncryptionAlgorithm(signerSeeds[i], 'ed25519');
                    if (signerWallet.classicAddress !== signerAddresses[i]) {
                         throw new Error(`Seed mismatch for signer ${signerAddresses[i]}`);
                    }
               }

               const signed = signerWallet.sign(preparedTx, true); // true = multisign
               console.log('Signed Transaction:', signed);

               if (signed.tx_blob) {
                    signerBlobs.push(signed.tx_blob);
               }
          }

          if (signerBlobs.length === 0) {
               throw new Error('No valid signatures collected for multisign transaction');
          }

          console.log('PreparedTx after signing:', preparedTx);
          console.log('signerBlobs:', signerBlobs);

          // Combine all signatures into one final multisigned transaction
          const multisignedTxBlob = xrpl.multisign(signerBlobs);

          console.log('Final multisignedTxBlob:', multisignedTxBlob);

          // Decode the multisigned transaction to get signers
          const decodedMultisigned = xrpl.decode(multisignedTxBlob) as any;
          const signers = decodedMultisigned.Signers || [];

          return { signedTx: { tx_blob: multisignedTxBlob, hash: xrpl.hashes.hashSignedTx(multisignedTxBlob) }, signers };
     }

     findDepositPreauthObjects(accountObjects: xrpl.AccountObjectsResponse) {
          const depositPreauthAccounts: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'DepositPreauth' && obj.Authorize) {
                         depositPreauthAccounts.push(obj.Authorize);
                    }
               });
          }
          return depositPreauthAccounts;
     }

     decodeRippleStateFlags(flagValue: any) {
          const TRUSTLINE_FLAGS = {
               lsfAMMNode: 0x01000000, // 16777216
               lsfLowReserve: 0x00020000, // 65536
               lsfHighReserve: 0x00040000, // 131072
               lsfLowAuth: 0x00010000, // 262144
               lsfHighAuth: 0x00020000, // 524288
               lsfLowNoRipple: 0x00100000, // 1048576
               lsfHighNoRipple: 0x00200000, // 2097152
               lsfLowFreeze: 0x00400000, // 4194304
               lsfHighFreeze: 0x00800000, // 8388608
               lsfLowDeepFreeze: 0x02000000, // 33554432
               lsfHighDeepFreeze: 0x04000000, // 67108864
          };

          const results = [];

          for (const [name, bit] of Object.entries(TRUSTLINE_FLAGS)) {
               if ((flagValue & bit) !== 0) {
                    results.push(name);
               }
          }

          return results.length > 0 ? results : ['No Flags Set'];
     }

     getFlagName(value: string): string {
          // 1. Try AppConstants.FLAGS
          // const appFlag = AppConstants.FLAGS.find(f => f.value.toString() === value)?.name;
          const appFlag = AppConstants.FLAGS.find(f => f.value === Number(value))?.label;
          if (appFlag) {
               return appFlag;
          }

          // 2. Try decodeRippleStateFlags
          const rippleFlags = this.decodeRippleStateFlags(Number(value));
          if (rippleFlags.length > 0) {
               return rippleFlags.join(', ');
          }

          // 3. Fallback: return raw value
          return `${value}`;
     }

     getFlagUpdates(currentFlags: any) {
          const setFlags: any[] = [];
          const clearFlags: any[] = [];

          AppConstants.FLAGS.forEach(flag => {
               const checkbox = document.getElementById(flag.name) as HTMLInputElement;
               if (!checkbox || !flag.xrplName) return;

               const desired = checkbox.checked;
               const actual = !!currentFlags[flag.xrplName];

               if (desired && !actual) setFlags.push(flag.value);
               if (!desired && actual) clearFlags.push(flag.value);
          });

          return { setFlags, clearFlags };
     }

     formatAmount(value: any): string {
          if (typeof value === 'string' && /^\d+$/.test(value)) {
               return (Number.parseInt(value) / 1_000_000).toFixed(6) + ' XRP';
          } else if (typeof value === 'object' && value.currency) {
               return `${value.value} ${value.currency}${value.issuer ? ` (<code>${value.issuer}</code>)` : ''}`;
          }
          return JSON.stringify(value);
     }

     formatIOUXrpAmountUI(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && amount.split(' ').length === 1) {
               // XRP in drops
               return `${amount} XRP`;
          } else if (amount.split(' ').length === 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]}`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, issuer, value } = amount;
               return `${value} ${currency} (issuer: ${issuer})`;
          }

          return 'Unknown';
     }

     formatIOUXrpAmountOutstanding(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, value } = amount;
               if (currency) {
                    return `${value} ${this.decodeIfNeeded(currency)}`;
               } else {
                    return `${value} MPT ${amount.mpt_issuance_id}`;
               }
          }

          return `${amount} XRP`;
     }

     setTxAmount(type: string, formValues: any, tx: xrpl.Transaction) {
          if (type === 'create') {
               if (formValues.currencyValue === 'MPT') {
                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.txUiService.mptIssuanceIdField(),
                         value: this.txUiService.amountField(),
                    };
                    tx.Amount = curr;
               } else if (formValues.currencyValue !== 'XRP' && formValues.currencyValue !== 'MPT') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: formValues.currencyValue.length > 3 ? this.encodeCurrencyCode(formValues.currencyValue) : formValues.currencyValue,
                         issuer: formValues.issuer,
                         value: this.txUiService.amountField(),
                    };
                    tx.Amount = curr;
               } else {
                    tx.Amount = xrpl.xrpToDrops(this.txUiService.amountField());
               }
          }
     }

     formatValue(key: string, value: any, nestedFields: string[] = []): string {
          if (key === 'Account' || key.includes('PubKey') || key.includes('Signature') || key.includes('index')) {
               return `<code>${value}</code>`;
          }
          if (key === 'Flags') {
               return this.getFlagName(String(value));
          }
          if (typeof value === 'string' && value.length > 50) {
               return `<code>${value.slice(0, 50)}...</code>`;
          }
          if (key === 'Memos') {
               const memoData = value[0].Memo.MemoData;
               const memoType = value[0].Memo.MemoType;
               return this.decodeHex(memoData) + (memoType ? ` (${this.decodeHex(memoType)})` : '');
          }
          if (key === 'Domain' || key === 'EmailHash' || key === 'URI') {
               return this.decodeHex(value);
          }
          if (key === 'Balance' && typeof value === 'object') {
               return `${value.value} ${value.currency}${value.issuer ? ` (<code>${value.issuer}</code>)` : ''}`;
          }
          if (key === 'Balance' || key === 'Fee') {
               return this.formatXRPLAmount(value);
          }
          if (key === 'date' || key === 'CancelAfter' || key === 'FinishAfter' || key === 'Expiration') {
               return this.convertXRPLTime(value);
          }
          if (typeof value === 'object') {
               return this.formatAmount(value);
          }

          return String(value);
     }

     increasesOwnerCount(tx: any): boolean {
          const type = tx.TransactionType;

          switch (type) {
               case 'TrustSet':
                    // Non-zero limit or flags will likely create a trustline
                    const limit = Number.parseFloat(tx?.LimitAmount?.value || '0');
                    const flags = tx?.Flags || 0;
                    return limit !== 0 || flags !== 0;

               case 'OfferCreate':
                    // Offers often create new ledger objects unless fully consumed
                    return true;

               case 'CheckCreate':
               case 'EscrowCreate':
               case 'PaymentChannelCreate':
               case 'TicketCreate':
               case 'SignerListSet':
               case 'AMMDeposit':
               case 'NFTokenMint':
                    return true;

               case 'AccountSet':
                    return false; // AccountSet does not increase owner count

               default:
                    return false;
          }
     }

     decodeAccountFlags(accountInfo: any): string[] {
          const activeFlags: string[] = [];

          if (accountInfo?.result?.account_flags) {
               for (const [flag, enabled] of Object.entries(accountInfo.result.account_flags)) {
                    if (enabled === true) {
                         const match = AppConstants.FLAGS.find(f => f.xrplName === flag);
                         activeFlags.push(match ? match.label : flag); // Use label if found, else raw name
                    }
               }
          }

          return activeFlags;
     }

     getMptFlagsReadable(flags: number): string[] {
          const readable: string[] = [];
          for (const [bit, description] of Object.entries(this.MPT_FLAGS)) {
               if ((flags & Number(bit)) !== 0) {
                    if (readable.length == 0) {
                         readable.push(description);
                    } else {
                         readable.push(' ' + description);
                    }
               }
          }
          return readable.length > 0 ? readable : ['No MPT flags set'];
     }

     formatFlags(flags: string[]): string {
          if (flags.length <= 1) return flags[0] || '';
          return flags.slice(0, -1).join(', ') + ' and ' + flags[flags.length - 1];
     }

     roundToEightDecimals(value: number): number {
          return Number.parseFloat(value.toFixed(8));
     }

     // sortByLedgerEntryType(response: any) {
     //      if (!response?.result || !Array.isArray(response.result.account_objects)) {
     //           return response; // nothing to sort
     //      }

     //      return {
     //           ...response,
     //           result: {
     //                ...response.result,
     //                account_objects: [...response.result.account_objects].sort((a, b) => {
     //                     const typeA = a.LedgerEntryType || '';
     //                     const typeB = b.LedgerEntryType || '';
     //                     return typeA.localeCompare(typeB); // alphabetical
     //                }),
     //           },
     //      };
     // }

     // isValidEmail(email: string): boolean {
     //      // Trim whitespace
     //      const trimmedEmail = email.trim();

     //      // Basic length and empty check
     //      if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
     //           return false;
     //      }

     //      // Regular expression for email validation
     //      // This follows RFC 5322 closely but avoids overly permissive edge cases
     //      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/i;

     //      if (!emailRegex.test(trimmedEmail)) {
     //           return false;
     //      }

     //      // Additional checks to prevent common invalid patterns
     //      const [localPart, domainPart] = trimmedEmail.split('@');

     //      // Local part should not exceed 64 characters
     //      if (localPart.length > 64) {
     //           return false;
     //      }

     //      // Domain part should have at least one dot and valid TLD
     //      const domainLabels = domainPart.split('.');
     //      if (domainLabels.some(label => label.length === 0 || label.length > 63)) {
     //           return false;
     //      }

     //      return true;
     // }

     adjustTextareaHeight(event: Event): void {
          const ta = event.target as HTMLTextAreaElement;
          ta.style.height = 'auto'; // reset
          ta.style.height = ta.scrollHeight + 'px';
     }

     validateAmmDepositBalances(xrpBalance: string, accountObjects: any[], we_want: CurrencyAmount, we_spend: CurrencyAmount): string | null {
          // Check XRP balance for we_spend
          if (typeof we_spend === 'string') {
               if (BigInt(xrpBalance) < BigInt(we_spend)) {
                    return 'Insufficient XRP balance';
               }
          }

          // Check XRP balance for we_want
          if (typeof we_want === 'string') {
               if (BigInt(xrpBalance) < BigInt(we_want)) {
                    return 'Insufficient XRP balance';
               }
          }

          // Check token balances from trust lines
          const trustLines = accountObjects.filter(obj => obj.LedgerEntryType === 'RippleState');

          // Check we_spend if it's an issued currency
          if (typeof we_spend !== 'string') {
               const trustLine = trustLines.find((line: any) => line.Balance.currency === we_spend.currency && (line.LowLimit.issuer === we_spend.issuer || line.HighLimit.issuer === we_spend.issuer));
               const availableBalance = trustLine ? Math.abs(Number.parseFloat(trustLine.Balance.value)) : 0;
               if (availableBalance < Number.parseFloat(we_spend.value)) {
                    return `Insufficient ${we_spend.currency} balance`;
               }
          }

          // Check we_want if it's an issued currency
          if (typeof we_want !== 'string') {
               const trustLine = trustLines.find((line: any) => line.Balance.currency === we_want.currency && (line.LowLimit.issuer === we_want.issuer || line.HighLimit.issuer === we_want.issuer));
               const availableBalance = trustLine ? Math.abs(Number.parseFloat(trustLine.Balance.value)) : 0;
               if (availableBalance < Number.parseFloat(we_want.value)) {
                    return `Insufficient ${we_want.currency} balance`;
               }
          }

          return null; // Sufficient balances
     }

     // In utilsService.ts
     validateAmmWithdrawBalances(xrpBalance: string, accountObjects: any[], lpTokenAmount: string, participation: any): string | null {
          // Validate LP token balance
          if (participation?.lpTokens?.[0]) {
               const availableLpBalance = Number.parseFloat(participation.lpTokens[0].balance);
               const requestedLpAmount = Number.parseFloat(lpTokenAmount);

               if (requestedLpAmount > availableLpBalance) {
                    return `Insufficient LP token balance. Available: ${availableLpBalance}`;
               }
          }

          return null; // Sufficient balances
     }

     // In utilsService.ts
     validateAmmCreateBalances(xrpBalance: string, accountObjects: any[], we_want: CurrencyAmount, we_spend: CurrencyAmount): string | null {
          // Check XRP balance (for Amount field)
          if (typeof we_spend === 'string') {
               // we_spend is XRP (string in drops)
               if (BigInt(xrpBalance) < BigInt(we_spend)) {
                    const xrpAmount = xrpl.dropsToXrp(we_spend);
                    return `Insufficient XRP balance. Required: ${xrpAmount} XRP`;
               }
          }

          // Check token balance (for Amount2 field)
          if (typeof we_want !== 'string') {
               // we_want is token (IssuedCurrencyAmount object)
               const trustLines = accountObjects.filter(obj => obj.LedgerEntryType === 'RippleState');

               const trustLine = trustLines.find(line => line.Balance.currency === we_want.currency && (line.LowLimit.issuer === we_want.issuer || line.HighLimit.issuer === we_want.issuer));

               const availableBalance = trustLine ? Math.abs(Number.parseFloat(trustLine.Balance.value)) : 0;
               if (availableBalance < Number.parseFloat(we_want.value)) {
                    return `Insufficient ${we_want.currency} balance. Required: ${we_want.value}`;
               }
          }

          return null; // Sufficient balances
     }

     isInsufficientXrpBalance1(serverInfo: any, accountInfo: any, amountXrp: string, address: string, txObject: any, feeDrops: string = '10'): boolean {
          try {
               // Validate inputs
               if (!amountXrp || Number.isNaN(Number.parseFloat(amountXrp)) || Number.parseFloat(amountXrp) < 0) {
                    throw new Error('Invalid amount: must be a non-negative number');
               }

               let amountDrops = 0n;

               // Define transaction types that involve sending XRP
               const xrpTransferTypes = new Set(['Payment', 'EscrowCreate', 'EscrowFinish', 'EscrowCancel', 'CheckCreate', 'CheckCash', 'CheckCancel', 'PaymentChannelCreate', 'PaymentChannelFund', 'PaymentChannelClaim', 'OfferCreate', 'OfferCancel', 'AMMCreate', 'AMMDeposit', 'AMMWithdraw']);

               // Calculate amountDrops only for transactions that involve sending XRP
               if (txObject?.TransactionType && xrpTransferTypes.has(txObject.TransactionType)) {
                    if (txObject?.Amount && typeof txObject.Amount === 'string') {
                         // XRP to XRP
                         amountDrops = BigInt(txObject.Amount);
                    } else if (typeof amountXrp === 'string' && !Number.isNaN(Number(amountXrp))) {
                         amountDrops = BigInt(xrpl.xrpToDrops(amountXrp));
                    }
               } else {
                    amountDrops = 0n; // No XRP transfer for non-payment transactions
               }

               // Get account info to calculate reserves
               const balanceDrops = BigInt(accountInfo.result.account_data.Balance);

               // Get server info for reserve requirements
               const baseReserveDrops = BigInt(xrpl.xrpToDrops(serverInfo.result.info.validated_ledger?.reserve_base_xrp || 10));
               const incReserveDrops = BigInt(xrpl.xrpToDrops(serverInfo.result.info.validated_ledger?.reserve_inc_xrp || 0.2));
               const ownerCount = BigInt(accountInfo.result.account_data.OwnerCount || 0);

               // Calculate total reserve (base + incremental)
               let totalReserveDrops = baseReserveDrops + ownerCount * incReserveDrops;

               if (txObject && this.increasesOwnerCount(txObject)) {
                    totalReserveDrops += incReserveDrops;
               }

               // Include transaction fee
               const fee = BigInt(feeDrops);

               // Check if balance is sufficient
               const requiredDrops = amountDrops + fee + totalReserveDrops;
               return balanceDrops < requiredDrops; // Return true if insufficient balance
          } catch (error: any) {
               console.error('Error checking XRP balance:', error);
               throw new Error(`Failed to check balance: ${error.message || 'Unknown error'}`);
          }
     }

     /**
      * Checks if the account has insufficient IOU balance on the relevant trust line
      * to support sending/debiting the specified amount.
      *
      * Works for:
      * - Payment / OfferCreate / etc. → looks at tx.Amount
      * - CheckCreate           → looks at tx.SendMax
      *
      * Returns true if balance is insufficient (or no trust line exists), false otherwise.
      */
     isInsufficientIouTrustlineBalance(
          accountLines: any, // typically from account_lines request .result
          txObject: any, // Payment | CheckCreate | similar
          issuer: string // ← often txObject.Destination for Payments, but for Checks it's usually irrelevant
     ): boolean {
          try {
               // Determine which field contains the Amount object (prefer SendMax for Checks, fallback to Amount)
               let amountField: any = null;

               if (txObject?.SendMax) {
                    amountField = txObject.SendMax;
               } else if (txObject?.Amount) {
                    amountField = txObject.Amount;
               }

               // Not an IOU amount (XRP string, missing, or invalid structure) → no IOU check needed
               if (!amountField || typeof amountField === 'string') {
                    return false;
               }

               const { currency, issuer: amountIssuer, value } = amountField;

               if (!currency || !amountIssuer || !value) {
                    throw new Error('Invalid IOU amount structure in transaction');
               }

               const requestedValue = Number.parseFloat(value);
               if (Number.isNaN(requestedValue) || requestedValue <= 0) {
                    throw new Error('Invalid or non-positive IOU amount value');
               }

               // Find the trust line where *we* (the sender) hold the token
               // → issuer in trust line == issuer in the amount object
               // → our account is the one with positive balance when we hold it
               const trustline = accountLines.result.lines.find((line: any) => line.currency === currency && line.account === amountIssuer);

               if (!trustline) {
                    // No trust line to this issuer/currency → definitely insufficient
                    return true;
               }

               // From sender's perspective:
               //   balance > 0  → we hold this many tokens (can send up to this)
               //   balance < 0  → we owe this many (can only send back to issuer, usually not useful here)
               //   balance = 0  → nothing to send
               const heldBalance = Number.parseFloat(trustline.balance);

               // We can only debit/send positive held amount
               return heldBalance < requestedValue;
          } catch (error: any) {
               console.error('Error checking IOU balance for tx:', error);
               // In production: you might want to return true (fail-safe = treat as insufficient)
               // or throw to let caller handle
               throw new Error(`Failed to check IOU balance: ${error.message || 'Unknown error'}`);
          }
     }

     /**
      * Checks if the account has insufficient IOU balance for a transaction.
      * @param accountLines - result of `account_lines` call
      * @param txObject - XRPL transaction object (Payment, OfferCreate, etc.)
      * @returns true if insufficient balance, false if sufficient
      */
     isInsufficientIouTrustlineBalance1(accountLines: any, txObject: any, destination: string): boolean {
          try {
               if (!txObject?.Amount || typeof txObject.Amount === 'string') {
                    // Not an IOU (string means XRP)
                    return false;
               }

               const iouAmount = txObject.Amount;
               const { currency, issuer, value } = iouAmount;

               if (!currency || !issuer || !value) {
                    throw new Error('Invalid IOU Amount structure');
               }

               const amountValue = Number.parseFloat(value);
               if (Number.isNaN(amountValue) || amountValue < 0) {
                    throw new Error('Invalid IOU amount value');
               }

               // Find the trustline for this issuer/currency
               const trustline = accountLines.result.lines.find((line: any) => line.currency === currency && (line.account === destination || line.issuer === issuer || line.account === issuer));

               if (!trustline) {
                    // No trustline → can’t send IOU
                    return true;
               }

               // Trustline balance is from *our perspective*
               // Negative balance = we owe IOUs, positive = we hold IOUs
               const balance = Number.parseFloat(trustline.balance);

               // We can only send what we have (positive balance)
               return Math.abs(balance) < amountValue;
          } catch (error: any) {
               console.error('Error checking IOU balance:', error);
               throw new Error(`Failed to check IOU balance: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountReserves(client: xrpl.Client, accountInfo: any, address: string): Promise<{ ownerCount: number; totalReserveXRP: number } | undefined> {
          try {
               const accountData = accountInfo.result.account_data;
               const ownerCount = Number(accountData.OwnerCount || 0);

               const reserveData = await this.getXrplReserve(client);
               if (!reserveData) {
                    throw new Error('Failed to fetch XRPL reserve data');
               }

               const { reserveBaseXRP, reserveIncrementXRP } = reserveData;

               // Calculate total in XRP units directly
               const totalReserveXRP = reserveBaseXRP + ownerCount * reserveIncrementXRP;

               return { ownerCount, totalReserveXRP };
          } catch (error: any) {
               console.error('Error in getAccountReserves:', error);
               this.setError(`${error.message || 'Unknown error'}`, undefined);
               return undefined;
          }
     }

     async getXrplReserve(client: xrpl.Client) {
          try {
               const ledger_info = await this.xrplService.getXrplServerState(client, 'current', '');
               const ledgerData = ledger_info.result.state.validated_ledger;
               if (!ledgerData) {
                    throw new Error('validated_ledger is undefined in server_state');
               }
               const baseFee = ledgerData.base_fee;
               const reserveBaseXRP = ledgerData.reserve_base;
               const reserveIncrementXRP = ledgerData.reserve_inc;

               return { reserveBaseXRP, reserveIncrementXRP };
          } catch (error: any) {
               console.error('Error:', error);
               this.setError(`${error.message || 'Unknown error'}`, undefined);
               return undefined;
          }
     }

     async updateOwnerCountAndReserves(client: xrpl.Client, accountInfo: any, address: string): Promise<{ ownerCount: string; totalXrpReserves: string }> {
          const reserves = await this.getAccountReserves(client, accountInfo, address);
          let ownerCount = '0';
          let totalXrpReserves = '0';
          if (reserves) {
               ownerCount = reserves.ownerCount.toString();
               totalXrpReserves = String(xrpl.dropsToXrp(reserves.totalReserveXRP));
               console.debug(`Owner Count: ${ownerCount} Total XRP Reserves: ${totalXrpReserves}`);
          }
          return { ownerCount, totalXrpReserves };
     }

     setError(message: string, spinner: { style: { display: string } } | undefined) {
          this.isError = true;
          this.isSuccess = false;
          this.result = `${message}`;
          this.spinner = false;
     }

     public setSuccess(message: string) {
          this.result = `${message}`;
          this.isError = false;
          this.isSuccess = true;
     }

     async getValidInvoiceID(input: string): Promise<string | null> {
          if (!input) {
               return null;
          }
          if (/^[0-9A-Fa-f]{64}$/.test(input)) {
               return input.toUpperCase();
          }
          try {
               const encoder = new TextEncoder();
               const data = encoder.encode(input);
               const hashBuffer = await crypto.subtle.digest('SHA-256', data);
               const hashArray = Array.from(new Uint8Array(hashBuffer));
               const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
               return hashHex.toUpperCase();
          } catch (error: any) {
               console.error(`Error in getValidInvoiceID ${error.message}`);
               throw new Error('Failed to hash InvoiceID');
          }
     }

     loadSignerList(account: string, signers: any) {
          const singerEntriesAccount = account + 'signerEntries';
          if (this.storageService.get(singerEntriesAccount) != null && this.storageService.get(singerEntriesAccount).length > 0) {
               signers = this.storageService.get(singerEntriesAccount).map((s: { Account: any; seed: any; SignerWeight: any }) => ({
                    account: s.Account,
                    seed: s.seed,
                    weight: s.SignerWeight,
               }));
          } else {
               this.clearSignerList(signers);
          }
     }

     clearSignerList(signers: any) {
          signers = [{ account: '', seed: '', weight: 1 }];
     }

     getUserEnteredAddress(userEnteredAddress: any) {
          return userEnteredAddress
               .split(',')
               .map((address: string) => address.trim())
               .filter((addr: string) => addr !== '');
     }

     formatMemos(memos: any[]): string {
          return memos
               .map(m => {
                    const data = Buffer.from(m.Memo.MemoData, 'hex').toString('utf8');
                    const type = m.Memo.MemoType ? Buffer.from(m.Memo.MemoType, 'hex').toString('utf8') : 'text/plain'; // Default if missing
                    return `${data} (${type})`;
               })
               .join('\n');
     }

     async setInvoiceIdField(tx: any, invoiceIdField: string) {
          const validInvoiceID = await this.getValidInvoiceID(invoiceIdField);
          if (validInvoiceID) {
               tx.InvoiceID = validInvoiceID;
          }
     }

     setSourceTagField(tx: any, sourceTagField: string) {
          tx.SourceTag = Number(sourceTagField);
     }

     setURI(tx: any, uri: string) {
          tx.URI = xrpl.convertStringToHex(uri);
     }

     setIssuerAddress(tx: any, issuerAddressField: string) {
          tx.Issuer = issuerAddressField;
     }

     setDestination(tx: any, destinationAddressField: string) {
          tx.Destination = destinationAddressField;
     }

     applyTicketSequence(accountInfo: any, accountObjects: any, tx: any, ticketSequence: string) {
          if (ticketSequence) {
               if (!this.isTicketExists(accountObjects, Number(ticketSequence))) {
                    throw new Error(`Ticket Sequence ${ticketSequence} not found for account ${accountObjects.account}`);
               }
               this.setTicketSequence(tx, ticketSequence, true);
          } else {
               this.setTicketSequence(tx, accountInfo.result.account_data.Sequence, false);
          }
     }

     isTicketExists(ticketObject: any, ticketSequence: number): boolean {
          try {
               const ticketExists = (ticketObject.result.account_objects || []).some((ticket: any) => ticket.TicketSequence === ticketSequence);
               return ticketExists;
          } catch (error: any) {
               console.error('Error checking ticket: ', error);
               return false; // Return false if there's an error fetching tickets
          }
     }

     setTicketSequence(tx: any, ticketSequence: string, useTicket: boolean) {
          if (useTicket) {
               tx.TicketSequence = Number(ticketSequence);
               tx.Sequence = 0;
               return;
          }
          tx.Sequence = Number(ticketSequence);
     }

     setMemoField(tx: any, memoField: string) {
          const memos = (memoField || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);
          if (memos.length > 0) {
               tx.Memos = memos.map(memo => ({
                    Memo: {
                         MemoData: Buffer.from(memo, 'utf8').toString('hex'),
                         MemoType: Buffer.from('text/plain', 'utf8').toString('hex'),
                    },
               }));
          } else {
               tx.Memos = [
                    {
                         Memo: {
                              MemoData: Buffer.from(memoField, 'utf8').toString('hex'),
                              MemoType: Buffer.from('text/plain', 'utf8').toString('hex'),
                         },
                    },
               ];
          }
     }

     setDestinationTag(tx: any, destinationTagField: string) {
          tx.DestinationTag = Number.parseInt(destinationTagField, 10);
     }

     setMessageKey(tx: any, messageKey: string) {
          tx.MessageKey = messageKey;
     }

     setDomain(tx: any, domain: string) {
          if (domain === '') {
               tx.Domain = '';
          } else {
               tx.Domain = Buffer.from(domain, 'utf8').toString('hex');
          }
     }

     setDomainId(tx: any, domainId: string) {
          tx.DomainID = domainId;
     }

     setCredentialIDsField(tx: any, credentials: string[]) {
          tx.CredentialIDs = credentials;
     }

     setTransferRate(tx: any, transferRate: number) {
          tx.TransferRate = transferRate;
     }

     setTransferFee(tx: any, transferFee: string) {
          tx.TransferFee = Number.parseInt(transferFee, 10);
     }

     setTickSize(tx: any, tickSize: number) {
          tx.TickSize = tickSize;
     }

     setExpiration(tx: any, expiration: number) {
          tx.Expiration = expiration;
     }

     setAmount(tx: any, amount: any) {
          tx.Amount = this.determineAmountType(amount);
     }

     setPublicKey(tx: any, publicKeyField: string) {
          tx.PublicKey = publicKeyField;
     }

     setCancelAfter(tx: any, cancelAfter: any) {
          tx.CancelAfter = cancelAfter;
     }

     determineAmountType(amount: any) {
          if (typeof amount === 'string') {
               // XRP
               return xrpl.xrpToDrops(amount);
          }

          if (typeof amount === 'object') {
               // Issued currency
               return amount.value;
          }
     }

     logLedgerObjects(fee: string, currentLedger: number, serverInfo: xrpl.ServerInfoResponse) {
          console.debug(`fee:`, fee);
          console.debug(`currentLedger:`, currentLedger);
          console.debug(`serverInfo:`, serverInfo);
     }

     logAccountInfoObjects(accountInfo: any, accountObject: any) {
          if (accountInfo) {
               console.debug(`accountInfo:`, accountInfo.result);
          }

          if (accountObject) {
               console.debug(`accountObject:`, accountObject.result);
          }
     }

     logAssets(asset: any, asset2: any) {
          if (asset) {
               console.debug(`asset:`, asset);
          }

          if (asset2) {
               console.debug(`asset2:`, asset2);
          }
     }

     logObjects(type: string, object: any) {
          if (object.result) {
               console.debug(`${type}`, object.result);
          } else {
               console.debug(`${type}`, object);
          }
     }

     logEscrowObjects(escrowObjects: xrpl.AccountObjectsResponse, escrow: any) {
          if (escrowObjects) {
               console.debug(`escrowObjects:`, escrowObjects?.result);
          }

          if (escrow) {
               console.debug(`escrow:`, escrow);
          }
     }
}
