import { Injectable, ElementRef, ViewChild, inject } from '@angular/core';
import * as xrpl from 'xrpl';
import { walletFromSecretNumbers, Wallet } from 'xrpl';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AppConstants } from '../../../core/app.constants';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { StorageService } from '../../shared/local-storage/storage.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { MPToken, RippleState } from '../../../models/interface-items.model';
import * as bip39 from 'bip39';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { CreateNftStoreService } from '../../nft/nft-store/nft-store.service';

type InputType = 'seed' | 'mnemonic' | 'secret_numbers' | 'unknown';

@Injectable({
     providedIn: 'root',
})
export class UtilsService {
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplService = inject(XrplService);
     public readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);

     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;

     constructor() {}

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

     validateInput(input: string | undefined | null): boolean {
          return typeof input === 'string' && !!input.trim();
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

     updateAmount(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.checksStoreService.setField('amount', '');
               return;
          }

          // Round to 6 decimal places (XRP precision)
          const rounded = Number(num.toFixed(6));
          this.accountConfiguratorStoreService.setField('amount', rounded.toString());
          this.checksStoreService.setField('amount', rounded.toString());
          this.escrowStoreService.setField('amount', rounded.toString());
          this.nftCreateStoreService.setField('amount', rounded.toString());
     }

     updateTransferFee(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.nftCreateStoreService.setField('transferFee', 0);
               return;
          }

          const rounded = Number(num.toFixed(3));
          this.nftCreateStoreService.setField('transferFee', rounded);
     }

     updateTrustlineLimitAmount(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.trustlineStoreService.setField('trustlineLimitField', 0);
               return;
          }

          // Round to 6 decimal places (XRP precision)
          const rounded = Number(num.toFixed(10));
          this.trustlineStoreService.setField('trustlineLimitField', rounded);
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

     toRippleTime(dateString: string): number {
          if (!dateString) throw new Error('Expiration date missing');

          const date = new Date(dateString);

          if (Number.isNaN(date.getTime())) {
               throw new TypeError('Invalid expiration date');
          }

          const rippleEpoch = Date.UTC(2000, 0, 1, 0, 0, 0);

          return Math.floor((date.getTime() - rippleEpoch) / 1000);
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

     formatTokenBalance(field: string, roundTo: number): string {
          return Number(field).toLocaleString(undefined, {
               minimumFractionDigits: 0,
               maximumFractionDigits: roundTo, // enough to preserve precision
               useGrouping: true,
          });
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

     /**
      * Converts an XRPL InvoiceID (hex string) to human-readable text if possible.
      * Falls back to truncated hex if not valid UTF-8.
      */
     formatInvoiceId(invoiceIdHex: string | undefined): string {
          if (invoiceIdHex?.length !== 64) {
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
          } catch (error: any) {
               console.warn(`InvoiceID is not valid UTF-8: ${error.message}`);
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

     truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     normalizeAddress(addr: string): string {
          if (!addr) return '';
          // Convert X-address to classic if needed, or just trim/lowercase
          return addr.trim(); // most wallets already use classic r... addresses
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

     decodeCurrencyCode(hexCode: string) {
          const buffer = Buffer.from(hexCode, 'hex');
          const trimmed = buffer.subarray(0, buffer.includes(0) ? buffer.indexOf(0) : 20);
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

     convertToEstTime(UtcDataTime: string): string {
          const utcDate = new Date(UtcDataTime);
          const formatter = this.dateFormatter();
          return formatter.format(utcDate);
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
               let regularKeySeed;
               const regularKeyAddress = regularKey;
               if (this.accountConfiguratorStoreService.regularKeySeed()) {
                    regularKeySeed = this.storageService.get(`${account}regularKeySeed`) ? this.storageService.get(`${account}regularKeySeed`) : this.accountConfiguratorStoreService.regularKeySeed();
                    this.storageService.set(`${account}regularKeySeed`, regularKeySeed);
               } else {
                    regularKeySeed = this.storageService.get(`${account}regularKeySeed`);
               }
               const isRegularKeyAddress = true;
               return { regularKeyAddress, regularKeySeed, isRegularKeyAddress };
          }
          this.storageService.removeValue(`${account}regularKeySeed`);
     }

     // validateQuorum(signers: any, signerQuorum: any) {
     //      const totalWeight = signers.reduce((sum: any, s: { weight: any }) => sum + (s.weight || 0), 0);
     //      if (signerQuorum > totalWeight) {
     //           return totalWeight;
     //      }
     // }

     // async toggleUseMultiSign(multiSignAddress: string, multiSignSeeds: string) {
     //      if (multiSignAddress === 'No Multi-Sign address configured for account') {
     //           multiSignSeeds = '';
     //           return { multiSignSeeds };
     //      }
     //      return null;
     // }

     // onTicketToggle(event: any, ticket: string, selectedTickets: any) {
     //      if (event.target.checked) {
     //           selectedTickets = [...selectedTickets, ticket];
     //      } else {
     //           selectedTickets = selectedTickets.filter((t: string) => t !== ticket);
     //      }
     //      return selectedTickets;
     // }

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
          if (response?.result[0].error) {
               return response?.result[0].error.trim();
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
          if (resultMsg === 'tecOWNERS') return 'tecOWNERS - Cannot modify object with existing owners (e.g. disable account with trust lines/offers).';
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
          return `\nCode: ${resultMsg}`;
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
               throw new TypeError('SignerList object does not have valid SignerEntries');
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

     formatIOUXrpAmountOutstanding(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }

          if (typeof amount === 'string') {
               const splitAmount = amount.split(' ');
               if (splitAmount.length > 1) {
                    return splitAmount[1] + ' ' + splitAmount[0] + ' ' + splitAmount[2];
               }
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, issuer, value } = amount;
               if (currency) {
                    return `${value} ${this.decodeIfNeeded(currency)} (issuer: ${issuer})`;
               } else {
                    return `${value} MPT ${amount.mpt_issuance_id}`;
               }
          }

          if (amount.split(' ').length === 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]}`;
          } else if (amount.split(' ').length > 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]} (issuer: ${splitAmount[4]})`;
          }

          return `${amount} XRP`;
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

     adjustTextareaHeight(event: Event): void {
          const ta = event.target as HTMLTextAreaElement;
          ta.style.height = 'auto'; // reset
          ta.style.height = ta.scrollHeight + 'px';
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

     setSourceTagField(tx: any, sourceTagField: any) {
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

     setTicketSequence(tx: any, ticketSequence: string, useTicket: boolean) {
          if (useTicket) {
               tx.TicketSequence = Number(ticketSequence);
               tx.Sequence = 0;
               return;
          }
          tx.Sequence = Number(ticketSequence);
     }

     addMemoField(tx: any, memoField: string | string[]) {
          const memoArray = Array.isArray(memoField)
               ? memoField
               : (memoField || '')
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean);

          if (memoArray.length > 0) {
               tx.Memos = memoArray
                    .filter(memo => memo && memo.trim() !== '') // Filter out empty strings
                    .map(memo => ({
                         Memo: {
                              MemoData: Buffer.from(memo, 'utf8').toString('hex'),
                              MemoType: Buffer.from('text/plain', 'utf8').toString('hex'),
                         },
                    }));
          } else {
               delete tx.Memos;
          }
     }

     setMemoField1(tx: any, memos: string[]) {
          if (!memos || memos.length === 0) return;

          tx.Memos = memos.map(memo => ({
               Memo: {
                    MemoData: Buffer.from(memo, 'utf8').toString('hex'),
                    MemoType: Buffer.from('text/plain', 'utf8').toString('hex'),
               },
          }));
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
               tx.Domain = domain;
          }
     }

     setDomainId(tx: any, domainId: string) {
          tx.DomainID = domainId;
     }

     toDomainId(domain: string): string {
          const hex = Buffer.from(domain, 'utf8').toString('hex').toUpperCase();
          return hex.padEnd(64, '0');
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

     setFinishAfter(tx: any, finishAfter: any) {
          tx.FinishAfter = finishAfter;
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
}
