import { inject, Injectable } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import * as xrpl from 'xrpl';
import didSchema from '../../../components/did/did-schema.json';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { percentToTransferRate } from 'xrpl';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AppConstants } from '../../../core/app.constants';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { PaymentChannelObject } from '../../../components/payment-channel/constants/payment-channel.types';
import { PaymentChannelUtilService } from '../../payment-channel/payment-channel-util/payment-channel-util.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { DidUtilService } from '../../did/did-util/did-util.service';
import { XrplWrapperService } from '../../xrpl-wrapper/xrpl-wrapper.service';

export interface ValidationContext {
     inputs: Record<string, any>;
     client?: xrpl.Client;
     accountInfo?: any;
     accountObjects?: any;
     fee?: string;
     currentLedger?: number;
     serverInfo?: any;
     invoiceId?: string;
     multiSignAddresses?: any;
     multiSignSeeds?: any;
     isRegularKeyAddress?: any;
     regularKeyAddress?: any;
     regularKeySeed?: any;
     useMultiSign?: any;
     env?: any;
}

export type ValidatorFn = (ctx: ValidationContext) => Promise<string | null> | string | null;

export interface TransactionValidationRule {
     transactionType: string;
     validators: ValidatorFn[];
     requiredFields?: string[];
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
     private readonly rules = new Map<string, TransactionValidationRule>();
     public readonly txUiService = inject(TransactionUiService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly xrplService = inject(XrplService);
     public readonly utilsService = inject(UtilsService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly xrplWrapperService = inject(XrplWrapperService);

     constructor() {
          this.registerBuiltInRules();
     }

     registerRule(rule: TransactionValidationRule) {
          this.rules.set(rule.transactionType, rule);
     }

     private getValueByPath(obj: any, path: string): any {
          if (!obj || !path) return undefined;

          return path.split('.').reduce((acc, part) => acc?.[part], obj);
     }

     async validate(transactionType: string, context: ValidationContext): Promise<string[]> {
          const rule = this.rules.get(transactionType);
          if (!rule) {
               return [`No validation rules for transaction type: ${transactionType}`];
          }

          const errors: string[] = [];

          // Check required fields
          // Replace the requiredFields loop with this safer version:
          if (rule.requiredFields) {
               for (const field of rule.requiredFields) {
                    const value = this.getValueByPath(context.inputs, field);
                    if (value === undefined || value === null || value === '') {
                         const fieldName = field.includes('.') ? field.split('.').pop() || 'Field' : field;
                         if (this.capitalize(fieldName) === 'Nf Token Minter Address') {
                              errors.push(`NFT Minter Address is required`);
                         } else {
                              errors.push(`${this.capitalize(fieldName)} is required`);
                         }
                    }
               }
          }
          // if (rule.requiredFields) {
          //      for (const field of rule.requiredFields) {
          //           const value = this.getValueByPath(context.inputs, field);
          //           if (value === undefined || value === null || value === '') {
          //                if (this.capitalize(field.split('.')[1]) === 'Nf Token Minter Address') {
          //                     errors.push(`NFT Minter Address is required`);
          //                } else {
          //                     errors.push(`${this.capitalize(field.split('.')[1])} is required`);
          //                }
          //           }
          //      }
          // }

          // Run all validators
          const results = await Promise.all(rule.validators.map(validator => Promise.resolve(validator(context))));

          results.forEach(err => err && errors.push(err));
          return errors.filter(Boolean);
     }

     private capitalize(str: string): string {
          return (
               str
                    // Insert space before a capital only when NOT followed by another capital
                    .replaceAll(/([a-z])([A-Z])(?![A-Z])/g, '$1 $2')
                    // Insert space between sequences like "ABCd" → "ABC d"
                    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                    // Capitalize first character
                    .replace(/^./, m => m.toUpperCase())
          );
     }

     // private capitalize(field: any): string {
     //      if (!field || typeof field !== 'string') return 'Field';
     //      return field
     //           .replace(/([A-Z])/g, ' $1')
     //           .replace(/^./, c => c.toUpperCase())
     //           .replace(/Id$/i, 'ID')
     //           .replace(/Nft/i, 'NFT')
     //           .replace(/Amm/i, 'AMM')
     //           .replace(/Mpt/i, 'MPT')
     //           .trim();
     // }

     private capitalize1(field: string | undefined | null): string {
          if (!field) return 'Field';

          // Handle camelCase
          let result = field
               .replace(/([A-Z])/g, ' $1') // Add space before capitals
               .replace(/^./, str => str.toUpperCase()); // Capitalize first letter

          // Fix common cases
          result = result.replace(/Id$/, 'ID').replace(/Nft/, 'NFT').replace(/Amm/, 'AMM').replace(/Mpt/, 'MPT');

          return result.trim();
     }

     private requireField(field: string, message?: string): ValidatorFn {
          return ctx => (ctx.inputs[field] ? null : message || `${this.capitalize(field)} is required`);
     }

     private isValidAddress(fieldName: string) {
          return async (context: ValidationContext): Promise<string | null> => {
               const value = this.getValueByPath(context.inputs, fieldName);
               if (!value) return null;

               // Use the wrapper service
               if (!this.xrplWrapperService.isValidAddress(value)) {
                    return `${this.capitalize(fieldName)} is not a valid XRP address`;
               }
               return null;
          };
     }

     private isValidSecret(fieldName: string) {
          return async (context: ValidationContext): Promise<string | null> => {
               const value = this.getValueByPath(context.inputs, fieldName);
               if (!value) return null;

               // Use the wrapper service
               if (!this.xrplWrapperService.isValidSecret(value)) {
                    return `${this.capitalize(fieldName)} is not a valid secret`;
               }
               return null;
          };
     }

     private notSelf(field1: string, field2: string): ValidatorFn {
          return ctx => {
               if (ctx.inputs[field1] && ctx.inputs[field2] && ctx.inputs[field1] === ctx.inputs[field2]) {
                    return 'Sender and receiver cannot be the same address';
               }
               return null;
          };
     }

     private numeric(field: string, options: { min?: number; max?: number; allowEmpty?: boolean; message?: string } = {}): ValidatorFn {
          return (ctx: ValidationContext): string | null => {
               const value = ctx.inputs[field];
               const { min, max, allowEmpty = false, message } = options;

               // Skip if empty and allowed
               if (this.shouldSkipNumericValidation(value) || (allowEmpty && value === '')) {
                    return null;
               }

               const num = Number.parseFloat(value as string);

               // Not a valid number
               if (Number.isNaN(num) || !Number.isFinite(num)) {
                    return message || `${this.capitalize(field)} must be a valid number`;
               }

               // Min check
               if (min !== undefined && num <= min) {
                    return message || `${this.capitalize(field)} must be greater than ${min}`;
               }

               // Max check – now 100% safe
               if (max !== undefined && num > max) {
                    return message || `${this.capitalize(field)} must be ${max} or less`;
               }

               // All good
               return null;
          };
     }

     private optionalNumeric(field: string, min?: number): ValidatorFn {
          return this.numeric(field, { min, allowEmpty: true });
     }

     private isValidNumber(value: string | undefined, fieldName: string, minValue?: number, maxValue?: number, allowEmpty: boolean = false): ValidatorFn {
          return async ctx => {
               if (value === undefined || (allowEmpty && value === '')) return null; // Skip if undefined or empty (when allowed)
               const num = Number.parseFloat(value);
               if (Number.isNaN(num) || !Number.isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num < minValue) {
                    return `${fieldName} must be greater than or equal to ${minValue}`;
               }
               if (maxValue !== undefined && num > maxValue) {
                    return `${fieldName} must be less than or equal to ${maxValue}`;
               }
               return null;
          };
     }

     private requireDestinationTagIfNeeded(action: string): ValidatorFn {
          return async ctx => {
               const dest = ctx.inputs[action]?.destination;
               if (!dest || !ctx.client) return null;

               try {
                    if (ctx.accountInfo.result.account_flags?.requireDestinationTag && !ctx.inputs['destinationTag']) {
                         return 'Destination account requires a destination tag';
                    }
               } catch (err: any) {
                    console.error(`Could not check destination tag requirement: ${err.message}`);
               }
               return null;
          };
     }

     private validDestinationTag(action: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[action]?.destinationTagField;
               if (!value) return null;

               const num = Number(value);
               if (Number.isNaN(num) || num < 0 || num > 4294967295 || !Number.isInteger(num)) {
                    return 'Destination Tag must be an integer between 0 and 4294967295';
               }
               return null;
          };
     }

     private validSourceTag(action: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[action]?.sourceTagField;
               if (!value) return null;

               const num = Number(value);
               if (Number.isNaN(num) || num < 0 || num > 4294967295 || !Number.isInteger(num)) {
                    return 'Source Tag must be an integer between 0 and 4294967295';
               }
               return null;
          };
     }

     private validInvoiceId(action: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[action]?.invoiceIdField;
               if (!value) return null;

               const hex = value.toString().replaceAll(/[^0-9a-fA-F]/g, '');
               if (hex.length === 0) {
                    return 'Invoice ID contains no valid hex characters';
               }
               if (hex.length > 64) {
                    return 'Invoice ID cannot exceed 64 hex characters (256 bits)';
               }
               return null;
          };
     }

     private invoiceId(action: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[action]?.invoiceIdField;
               if (!value) return null;
               return this.utilsService.validateInput(value) ? null : 'Invoice ID is invalid (contains disallowed characters)';
          };
     }

     private readonly shouldSkipNumericValidation = (value: string | undefined): boolean => {
          return value === undefined || value === null || value.trim() === '';
     };

     private multiSign(): ValidatorFn {
          return ctx => {
               const addressesStr = ctx.inputs['multiSignAddresses'];
               const seedsStr = ctx.inputs['multiSignSeeds'];

               if (!addressesStr && !seedsStr) return null;
               if (!addressesStr || !seedsStr) return null; // let required() handle missing

               const addresses = this.utilsService.getMultiSignAddress(addressesStr);
               const seeds = this.utilsService.getMultiSignSeeds(seedsStr);

               if (addresses.length === 0) {
                    return 'At least one signer address is required for multi-signing';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds';
               }

               const invalidAddr = addresses.find((addr: string) => !this.xrplWrapperService.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}`;
               }

               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid';
               }

               return null;
          };
     }

     private credentialExists(): ValidatorFn {
          return ctx => {
               const credentialID = this.getValueByPath(ctx.inputs, 'credentialID');
               if (!credentialID) return null; // let requiredFields handle missing

               const objects = ctx.accountObjects?.result?.account_objects || [];
               const found = objects.find((obj: any) => obj.LedgerEntryType === 'Credential' && obj.index === credentialID);

               return found ? null : 'Credential not found on the ledger';
          };
     }

     private credentialNotAlreadyAccepted(): ValidatorFn {
          return ctx => {
               const credentialID = this.getValueByPath(ctx.inputs, 'credentialID');
               if (!credentialID) return null;

               const objects = ctx.accountObjects?.result?.account_objects || [];
               const cred = objects.find((obj: any) => obj.LedgerEntryType === 'Credential' && obj.index === credentialID);

               if (!cred) return null; // existence checked separately

               if (cred.Flags === AppConstants.LSF_ACCEPTED) {
                    return 'This credential has already been accepted';
               }

               return null;
          };
     }

     private credentialNotExpired(): ValidatorFn {
          return ctx => {
               const credentialID = this.getValueByPath(ctx.inputs, 'credentialID');
               if (!credentialID) return null;

               const objects = ctx.accountObjects?.result?.account_objects || [];
               const cred = objects.find((obj: any) => obj.LedgerEntryType === 'Credential' && obj.index === credentialID);

               if (!cred?.Expiration) return null;

               if (this.utilsService.isRippleExpired(cred.Expiration)) {
                    return 'This credential has expired';
               }

               return null;
          };
     }

     private validExpirationDateForCreate(): ValidatorFn {
          return ctx => {
               const expiration = this.getValueByPath(ctx.inputs, 'createCredential.expirationRipple');
               if (!expiration) return null; // optional field

               const rippleTime = this.xrplDateService.toRippleTime(expiration);
               if (Number.isNaN(rippleTime) || rippleTime! <= 0) {
                    return 'Invalid expiration date format';
               }

               return null;
          };
     }

     private didExistsForDelete(): ValidatorFn {
          return ctx => {
               if (ctx.inputs?.['transactionType'] !== 'deleteDid') return null;

               const objects = ctx.accountObjects?.result?.account_objects || [];
               const hasDid = objects.some((obj: any) => obj.LedgerEntryType === 'DID');

               return hasDid ? null : 'No DID found on this account to delete';
          };
     }

     private requireIf(condition: (ctx: ValidationContext) => boolean, field: string, message?: string): ValidatorFn {
          return ctx => (condition(ctx) && !ctx.inputs[field] ? message || `${this.capitalize(field)} is required` : null);
     }

     private validAddressIf(condition: (ctx: ValidationContext) => boolean, field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               return condition(ctx) && value && !this.xrplWrapperService.isValidAddress(value) ? `${this.capitalize(field)} is not a valid XRP address` : null;
          };
     }

     private validSecretIf(condition: (ctx: ValidationContext) => boolean, field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               return condition(ctx) && value && !xrpl.isValidSecret(value) ? `${this.capitalize(field)} is invalid` : null;
          };
     }

     private masterKeyDisabledRequiresAltSigning(): ValidatorFn {
          return ctx => {
               const flags = ctx.accountInfo?.result?.account_flags;
               const disableMaster = flags?.disableMasterKey === true;

               const usingRegularKey = !!ctx.inputs['regularKey']?.isRegularKey;
               const usingMultiSign = !!ctx.inputs['multiSign']?.enabled;

               if (disableMaster && !usingRegularKey && !usingMultiSign) {
                    return 'Master key is disabled. Must sign with Regular Key or Multi-sign.';
               }
               return null;
          };
     }

     private ticketValidation(): ValidatorFn {
          return ctx => {
               if (!ctx.inputs['isTicket']) return null;
               if (!ctx.inputs['selectedSingleTicket']) {
                    return 'Ticket Sequence is required when using a ticket';
               }
               const num = Number.parseFloat(ctx.inputs['selectedSingleTicket'] as string);
               if (Number.isNaN(num) || num <= 0) {
                    return 'Ticket Sequence must be a valid number greater than 0';
               }
               return null;
          };
     }

     private regularKeySigningValidation(): ValidatorFn[] {
          const whenRegularKey = (ctx: ValidationContext) => !!ctx.inputs['isRegularKey']?.isRegularKey && !ctx.inputs['multiSign']?.enabled;

          // And use these paths:
          return [this.requireIf(whenRegularKey, 'isRegularKey.address', 'Regular Key Address is required'), this.requireIf(whenRegularKey, 'isRegularKey.seed', 'Regular Key Seed is required'), this.validAddressIf(whenRegularKey, 'isRegularKey.address'), this.validSecretIf(whenRegularKey, 'isRegularKey.seed')];
     }

     private positiveAmount(action: string): ValidatorFn {
          return ctx => {
               let value;
               let field;
               if (action === 'createTicket') {
                    value = ctx.inputs[action]?.amount;
                    field = 'Ticket Count';
               } else if (action === 'createMpt') {
                    value = ctx.inputs[action]?.amount;
                    field = 'Token Count';
               } else if (action === 'issueCurrency' || action === 'clawbackTokens' || action === 'setTrustline') {
                    value = ctx.inputs[action]?.amount;
                    field = 'Trustline Limit';
               } else if (action === 'modifyMultiSigners') {
                    value = ctx.inputs[action]?.signerQuorum;
                    field = 'Signer Quorum';
               } else {
                    value = ctx.inputs[action]?.amount;
                    field = 'Amount';
               }

               // If field is empty, let requiredFields handle it
               if (value === '') return null;

               const num = Number(value);
               if (Number.isNaN(num)) return `${field} must be a valid number`;
               if (num <= 0) return `${field} must be greater than 0`;
               return null;
          };
     }

     private validateDate(action: any, field: string): ValidatorFn {
          return ctx => {
               let value = ctx.inputs[action]?.[field];

               // If field is empty, let requiredFields handle it
               if (value === '') return null;

               const num = Number(value);
               if (Number.isNaN(num)) return 'Date must be a valid number';
               if (num <= 0) return 'Date must be greater than 0';
               return null;
          };
     }

     private validateDidData(data: string, documentType: string): ValidatorFn {
          return ctx => {
               if (!data) return null; // Not required
               const result = this.didUtilService.validateAndConvertDidJson(data, didSchema);
               if (!result.success) {
                    return `${documentType} is invalid: ${result.errors || 'Unknown error'}`;
               }
               return null;
          };
     }

     private validCurrency(field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               if (!value) return null;
               return this.utilsService.isValidCurrencyCode(value) ? null : `${this.capitalize(field)} must be a valid currency code (3-20 chars or 40-char hex)`;
          };
     }

     private requireIssuerIfNotXRP(currencyField: string, issuerField: string): ValidatorFn {
          return ctx => {
               const currency = ctx.inputs[currencyField];
               const issuer = ctx.inputs[issuerField];
               if (currency && currency !== 'XRP' && !issuer) {
                    return `${this.capitalize(issuerField)} is required when currency is not XRP`;
               }
               return null;
          };
     }

     private validIssuerIfProvided(currencyField: string, issuerField: string): ValidatorFn {
          return ctx => {
               const currency = ctx.inputs[currencyField];
               const issuer = ctx.inputs[issuerField];
               if (currency && currency !== 'XRP' && issuer && !this.xrplWrapperService.isValidAddress(issuer)) {
                    return `${this.capitalize(issuerField)} is not a valid XRP address`;
               }
               return null;
          };
     }

     private positiveNumber(field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               if (!value) return null;
               const num = Number(value);
               if (Number.isNaN(num) || num <= 0) {
                    return `${this.capitalize(field)} must be greater than 0`;
               }
               return null;
          };
     }

     private validOfferSequences(field = 'offerSequenceField'): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               if (!value) return null;

               const sequences = (value as string)
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

               if (sequences.length === 0) {
                    return 'At least one offer sequence is required';
               }

               const invalid = sequences.find(seq => {
                    const n = Number.parseInt(seq, 10);
                    return Number.isNaN(n) || n <= 0;
               });

               if (invalid) {
                    return `Invalid offer sequence: ${invalid}. Must be positive integers`;
               }

               return null;
          };
     }

     private notSelfOffer(issuerField: string): ValidatorFn {
          return ctx => {
               const sender = ctx.inputs['senderAddress'];
               const issuer = ctx.inputs[issuerField];
               if (sender && issuer && sender === issuer) {
                    return 'Cannot create offer to yourself';
               }
               return null;
          };
     }

     // AMM-specific reusable validators

     private validTradingFee(): ValidatorFn {
          return ctx => {
               const value = ctx.inputs['tradingFeeField'];
               if (!value) return null;
               const num = Number(value);
               if (Number.isNaN(num) || num < 0 || num > 1000) {
                    return 'Trading fee must be between 0 and 1000 (inclusive)';
               }
               return null;
          };
     }

     private requireAtLeastOneAmountForDeposit(): ValidatorFn {
          return ctx => {
               const both = ctx.inputs['weWantAmountField'] || ctx.inputs['weSpendAmountField'];
               if (!both) {
                    return 'At least one amount must be provided for deposit (single or both assets)';
               }
               return null;
          };
     }

     // private validLpTokenAmount(field = 'lpTokenAmountField'): ValidatorFn {
     //      return ctx => {
     //           const value = ctx.inputs[field];
     //           if (!value) return null;
     //           const num = Number(value);
     //           if (Number.isNaN(num) || num <= 0) {
     //                return `${this.capitalize(field)} must be greater than 0`;
     //           }
     //           return null;
     //      };
     // }

     private requireCurrencyPair(): ValidatorFn {
          return ctx => {
               const want = ctx.inputs['firstPoolCurrencyField'] || ctx.inputs['weWantCurrencyField'];
               const spend = ctx.inputs['secondPoolCurrencyField'] || ctx.inputs['weSpendCurrencyField'];
               if (!want || !spend) {
                    return 'Both currencies in the trading pair are required';
               }
               if (want === spend) {
                    return 'The two assets in the AMM pool cannot be the same';
               }
               return null;
          };
     }

     private getSeed(ctx: any): string | null {
          const wallet = ctx.inputs['wallet'];
          const regularKey = ctx.inputs['regularKey'];
          const multiSign = ctx.inputs['multiSign'];

          const walletSeed = wallet?.seed?.trim() ? wallet.seed.trim() : null;

          const walletMnemonic = wallet?.mnemonic?.trim() ? wallet.mnemonic.trim() : null;

          if (walletSeed) return walletSeed;
          if (walletMnemonic) return walletMnemonic;

          if (regularKey?.seed?.trim()) return regularKey.seed.trim();

          if (multiSign?.seeds?.length) {
               const first = multiSign.seeds[0]?.trim();
               return first || null;
          }

          return null;
     }

     private walletCredentialRequired() {
          return (ctx: ValidationContext): string | null => {
               const seed = this.getSeed(ctx);

               if (!seed) {
                    return 'Wallet must have a seed or mnemonic (or valid signing credentials)';
               }

               const { value } = this.utilsService.detectXrpInputType(seed);

               if (value === 'unknown') {
                    return 'Wallet signing credential is invalid';
               }

               return null;
          };
     }

     private validNftTaxon(): ValidatorFn {
          return ctx => {
               const taxon = ctx.inputs['createNft']?.taxon;
               if (taxon === undefined || taxon === '') return null;

               const num = Number(taxon);
               if (Number.isNaN(num) || !Number.isInteger(num) || num < 0 || num > 0xffffffff) {
                    return 'Taxon must be an integer between 0 and 4294967295 (0xFFFFFFFF)';
               }
               return null;
          };
     }

     private validTransferFee(): ValidatorFn {
          return ctx => {
               const transferFee = ctx.inputs['createNft']?.transferFee;
               const flags = ctx.inputs['createNft']?.nftFlags ?? 0; // or however you store the combined flags

               if (transferFee === undefined || transferFee === '' || transferFee === null) return null;

               const num = Number(transferFee);
               if (Number.isNaN(num) || !Number.isInteger(num) || num < 0 || num > 50000) {
                    return 'Transfer Fee must be an integer between 0 and 50000 (0.000% – 50.000%)';
               }

               // Critical: TransferFee requires tfTransferable flag
               const isTransferable = !!(flags & xrpl.NFTokenMintFlags.tfTransferable);
               if (num > 0 && !isTransferable) {
                    return 'Transfer Fee can only be set when the Transferable flag is enabled';
               }

               return null;
          };
     }

     private validNftExpiration(): ValidatorFn {
          return async ctx => {
               const expirationStr = ctx.inputs['createNft']?.expiration; // or nftOffer.expiration, etc.

               if (!expirationStr) return null;

               try {
                    const rippleTime = this.xrplDateService.toRippleTime(expirationStr);
                    if (Number.isNaN(rippleTime) || rippleTime! <= 0) {
                         return 'Invalid expiration date format';
                    }

                    // Must be in the future (compare to current ledger close time)
                    const currentLedgerTime = ctx.inputs['env']['ledgerInfo']?.currentRippleTime;

                    if (rippleTime! <= currentLedgerTime!) {
                         return 'Expiration must be in the future';
                    }
               } catch (error: any) {
                    console.error('Error validating expiration date: ', error);
                    return 'Invalid expiration date';
               }

               return null;
          };
     }

     private validNftMinter(): ValidatorFn {
          return ctx => {
               const minter = (ctx.inputs['createNft']?.nfTokenMinterAddress || ctx.inputs['createNft']?.nftCreator || '').trim();

               if (!minter) return null; // optional in most cases

               if (!xrpl.isValidClassicAddress(minter)) {
                    return 'NFT Minter must be a valid XRPL classic address';
               }

               const account = ctx.accountInfo?.result?.account_data?.Account;
               if (account && minter === account) {
                    return 'Cannot set the account itself as its own NFT minter (creates a loop)';
               }

               return null;
          };
     }

     private validNftUri(): ValidatorFn {
          return ctx => {
               const uri = ctx.inputs['createNft']?.initialURI?.trim();
               if (!uri) return null; // URI is optional

               if (uri.length > 256) {
                    return 'URI cannot exceed 256 bytes';
               }

               // Basic check that it looks like a URL or IPFS
               if (!uri.startsWith('http') && !uri.startsWith('ipfs') && !uri.startsWith('https')) {
                    return 'URI should preferably start with http/https/ipfs';
               }

               return null;
          };
     }

     private nftFlagsConsistency(): ValidatorFn {
          return ctx => {
               const flags = ctx.inputs['createNft']?.nftFlags ?? 0;
               const transferFee = ctx.inputs['createNft']?.transferFee;

               const isTransferable = !!(flags & xrpl.NFTokenMintFlags.tfTransferable);

               if (transferFee && Number(transferFee) > 0 && !isTransferable) {
                    return 'Transferable flag must be enabled when setting a Transfer Fee > 0';
               }

               return null;
          };
     }

     private registerBuiltInRules() {
          // AccountInfo
          this.registerRule({
               transactionType: 'AccountInfo',
               requiredFields: ['seed', 'accountInfo'],
               validators: [
                    ctx => {
                         if (!ctx.accountInfo) {
                              return 'Account info not loaded';
                         }
                         return null;
                    },
               ],
          });

          // AccountDelete
          this.registerRule({
               transactionType: 'AccountDelete',
               requiredFields: ['destination'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => {
                         console.log('ctx: ', ctx['inputs']['destination']);
                         this.xrplWrapperService.isValidAddress(ctx['inputs']['destination']);
                         return null;
                    },

                    this.requireDestinationTagIfNeeded('destination'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentXrp
          this.registerRule({
               transactionType: 'PaymentXrp',
               requiredFields: ['paymentXrp.amount', 'paymentXrp.destination'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('paymentXrp'),
                    // Destination address valid
                    this.isValidAddress('paymentXrp.destination'),
                    this.requireDestinationTagIfNeeded('paymentXrp'),

                    this.validDestinationTag('paymentXrp'),
                    this.validSourceTag('paymentXrp'),
                    this.validInvoiceId('paymentXrp'),

                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('paymentXrp'),
               ],
          });

          // CreateTicket
          this.registerRule({
               transactionType: 'CreateTicket',
               requiredFields: ['createTicket.amount'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('createTicket'),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // DeleteTicket
          this.registerRule({
               transactionType: 'DeleteTicket',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // Delegate Actions
          this.registerRule({
               transactionType: 'DelegateActions',
               requiredFields: ['destination.address'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.isValidAddress('destination.address'),
                    // this.notSelf('senderAddress', 'destination.address'),
                    this.requireDestinationTagIfNeeded('destination'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PermissionedDomainSet Actions
          this.registerRule({
               transactionType: 'PermissionedDomainSet',
               requiredFields: ['permissionedDomainSet.setAcceptedCredentials'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // ctx => {
                    //      const credentials = ctx.inputs['permissionedDomainSet'].setAcceptedCredentials;
                    //      console.log('Credentials: ', credentials);

                    //      if (credentials.length === 0 || credentials.length > 10) {
                    //           return `Exactly 1–10 credentials required (got ${credentials.length})`;
                    //      }

                    //      const credentialTypes = credentials.map((c: { credentialType: any }) => c.credentialType);
                    //      const duplicates = credentialTypes.filter((id: any, index: any) => credentialTypes.indexOf(id) !== index);
                    //      if (duplicates.length > 0) {
                    //           return `Duplicate credential Type found: ${duplicates.join(', ')}`;
                    //      }

                    //      for (const credential of credentials) {
                    //           if (!credential.credentialType || !credential.issuer) {
                    //                return 'Each credential must have both credential Type and issuer';
                    //           }
                    //      }

                    //      return null;
                    // },

                    // ctx => {
                    //      const domainId = ctx.inputs['permissionedDomainSet']?.domainId;
                    //      if (domainId && domainId.length > 256) {
                    //           return 'Domain ID exceeds maximum length of 256 characters';
                    //      }
                    //      return null;
                    // },

                    // ctx => {
                    //      const credentials = ctx.inputs['permissionedDomainSet'].setAcceptedCredentials;
                    //      for (const credential of credentials) {
                    //           if (credential.issuer && !xrpl.isValidClassicAddress(credential.issuer)) {
                    //                return `Invalid issuer address format for credential: ${credential.credentialType}`;
                    //           }
                    //      }
                    //      return null;
                    // },

                    // ctx => {
                    //      const domainId = ctx.inputs['permissionedDomainSet']?.domainId;
                    //      const existingDomains = ctx.accountObjects?.filter((obj: { LedgerEntryType: string }) => obj.LedgerEntryType === 'PermissionedDomain');

                    //      if (domainId && existingDomains?.some((domain: { DomainID: any }) => domain.DomainID === domainId)) {
                    //           return `Permissioned Domain with ID ${domainId} already exists. Use modify operation instead.`;
                    //      }
                    //      return null;
                    // },

                    // ctx => {
                    //      const credentials = ctx.inputs['permissionedDomainSet'].setAcceptedCredentials;
                    //      const existingDomains = ctx.accountObjects?.filter((obj: { LedgerEntryType: string }) => obj.LedgerEntryType === 'PermissionedDomain');

                    //      if (existingDomains) {
                    //           const usedCredentials = new Set(existingDomains.flatMap((domain: { Credentials: any[] }) => domain.Credentials?.map(c => c.CredentialID) || []));
                    //           const duplicates = credentials.filter((c: { credentialID: any }) => usedCredentials.has(c.credentialID));
                    //           if (duplicates.length > 0) {
                    //                return `Credentials already used in other domains: ${duplicates.map((c: { credentialID: any }) => c.credentialID).join(', ')}`;
                    //           }
                    //      }
                    //      return null;
                    // },

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PermissionedDomainDelete Actions
          this.registerRule({
               transactionType: 'PermissionedDomainDelete',
               requiredFields: ['permissonedDomainDelete.domainId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use alt signing
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket
                    this.ticketValidation(),

                    // Regular Key
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign
                    this.multiSign(),
               ],
          });

          // DIDSet Actions
          this.registerRule({
               transactionType: 'DIDSet',
               requiredFields: ['did.didDocument', 'did.didUri', 'did.didData'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      console.log('didDocument: ', ctx['inputs']['did']['didDocument']);
                    //      console.log('didUri: ', ctx['inputs']['did']['didUri']);
                    //      console.log('didData: ', ctx['inputs']['did']['didData']);
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => this.validateDidData(ctx.inputs['didDocument'], 'DID Document')(ctx),
                    ctx => this.validateDidData(ctx.inputs['didUri'], 'DID URI')(ctx),
                    ctx => this.validateDidData(ctx.inputs['didData'], 'DID Data')(ctx),

                    // Master key disabled → must use alt signing
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket
                    this.ticketValidation(),

                    // Regular Key
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign
                    this.multiSign(),
               ],
          });

          // DIDdelete Actions
          this.registerRule({
               transactionType: 'DIDdelete',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.didExistsForDelete(),

                    // Master key disabled → must use alt signing
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket
                    this.ticketValidation(),

                    // Regular Key
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign
                    this.multiSign(),
               ],
          });

          // CredentialCreate Actions
          this.registerRule({
               transactionType: 'CredentialCreate',
               requiredFields: ['createCredential.credentialType', 'createCredential.subject'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('credentials.subject'),
                    this.validExpirationDateForCreate(),
               ],
          });

          // CredentialDelete Actions
          this.registerRule({
               transactionType: 'CredentialDelete',
               requiredFields: ['deleteCredentials.credentialID', 'deleteCredentials.credentialType', 'deleteCredentials.subject'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.isValidAddress('deleteCredentials.subject'),

                    this.credentialExists(),
               ],
          });

          // CredentialAccept Actions
          this.registerRule({
               transactionType: 'CredentialAccept',
               requiredFields: ['acceptCredentials.credentialID', 'acceptCredentials.credentialIssuer'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.isValidAddress('acceptCredentials.credentialIssuer'),
                    this.credentialExists(),
                    this.credentialNotAlreadyAccepted(),
                    this.credentialNotExpired(),
               ],
          });

          // CredentialVerify Actions
          this.registerRule({
               transactionType: 'CredentialVerify',
               requiredFields: ['credentials.credentialId', 'credentials.credentialType'],
               validators: [
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CreateCheck
          this.registerRule({
               transactionType: 'CreateCheck',
               requiredFields: ['createCheck.amount', 'createCheck.destination'],
               validators: [
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('createCheck'),
                    this.isValidAddress('createCheck.destination'),
                    this.requireDestinationTagIfNeeded('createCheck'),

                    this.validDestinationTag('createCheck'),
                    this.validSourceTag('createCheck'),
                    this.validInvoiceId('createCheck'),

                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('createCheck'),
               ],
          });

          // CashCheck
          this.registerRule({
               transactionType: 'CashCheck',
               requiredFields: ['cashCheck.amount', 'cashCheck.checkIdField'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('cashCheck'),
                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CancelCheck
          this.registerRule({
               transactionType: 'CancelCheck',
               requiredFields: ['cancelCheck.checkIdField'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.requireDestinationTagIfNeeded('createCheck'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelCreate
          this.registerRule({
               transactionType: 'PaymentChannelCreate',
               requiredFields: ['paymentChannelCreate.amount', 'paymentChannelCreate.destination', 'paymentChannelCreate.settleDelay'],
               validators: [
                    this.walletCredentialRequired(),
                    this.positiveAmount('paymentChannelCreate'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.isValidAddress('paymentChannelCreate.destination'),
                    this.requireDestinationTagIfNeeded('paymentChannelCreate'),

                    this.optionalNumeric('paymentChannelCreate.settleDelay', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelFund
          this.registerRule({
               transactionType: 'PaymentChannelFund',
               requiredFields: ['paymentChannelFund.amount', 'paymentChannelFund.channelIDField'],
               validators: [
                    this.walletCredentialRequired(),
                    this.positiveAmount('paymentChannelFund'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.requireDestinationTagIfNeeded('paymentChannelCreate'),

                    this.optionalNumeric('paymentChannelFund.amount', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelRenew
          this.registerRule({
               transactionType: 'PaymentChannelRenew',
               requiredFields: ['paymentChannelRenew.channelIDField'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.isValidAddress('paymentChannelRenew.destination'),
                    // this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeeded('paymentChannelCreate'),

                    this.optionalNumeric('paymentChannelRenew.channelIDField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelClaim
          this.registerRule({
               transactionType: 'PaymentChannelClaim',
               requiredFields: ['paymentChannelClaim.amount', 'paymentChannelClaim.channelIDField', 'paymentChannelClaim.claimSignature'],
               validators: [
                    this.walletCredentialRequired(),
                    this.positiveAmount('paymentChannelClaim'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         let requestedDrops: string;
                         try {
                              requestedDrops = xrpl.xrpToDrops(ctx.inputs['paymentChannelClaim']['amount']);
                         } catch {
                              return 'Invalid XRP amount';
                         }

                         const channelExist = (ctx.inputs['env']['accountObjects'].result.account_objects as PaymentChannelObject[]).find(c => c.index === ctx.inputs['paymentChannelClaim']['channelIDField']);
                         if (!channelExist) {
                              return `Payment channel ${ctx.inputs['paymentChannelClaim']['channelIDField']} not found`;
                         }

                         if (!ctx.inputs['paymentChannelClaim']['amount']) {
                              return 'Amount is required';
                         }

                         const remainingDrops = BigInt(channelExist.Amount || '0') - BigInt(channelExist.Balance || '0');
                         if (BigInt(requestedDrops) > remainingDrops) {
                              return `Claim amount exceeds remaining (${xrpl.dropsToXrp(remainingDrops.toString())} XRP)`;
                         }
                         return null;
                    },

                    this.optionalNumeric('paymentChannelClaim.channelIDField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelClose
          this.registerRule({
               transactionType: 'PaymentChannelClose',
               requiredFields: ['paymentChannelClose.channelIDField'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         const channels = ctx.inputs['env']['accountObjects'].result.account_objects as PaymentChannelObject[];
                         const channel = channels.find(c => c.index === ctx.inputs['paymentChannelClose']['channelIDField']);
                         if (!channel) {
                              return `Payment channel ${ctx.inputs['paymentChannelClose']['channelIDField']} not found`;
                         }

                         let isOwnerCancelling = ctx.inputs['wallet']['address'] === channel.Account;

                         if (channel.Expiration && channel.Expiration > ctx.inputs['env']['ledgerInfo']['currentRippleTime']) {
                              return 'Cannot close channel before expiration';
                         }

                         const hasChannelExpired = this.paymentChannelUtilService.checkChannelExpired(channel);

                         const ownerCancelling = !!isOwnerCancelling;
                         const expired = !!hasChannelExpired;

                         if (!ownerCancelling && !expired) {
                              const amount = BigInt(channel.Amount ?? '0');
                              const balance = BigInt(channel.Balance ?? '0');
                              const remaining = amount - balance;
                              if (remaining > 0n) {
                                   return `Cannot close channel with non-zero balance. ${xrpl.dropsToXrp(remaining.toString())} XRP still available to claim.`;
                              }
                         }
                         return null;
                    },

                    this.optionalNumeric('channelIDField.channelIDField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // PaymentChannelGenerateCreatorClaimSignature
          this.registerRule({
               transactionType: 'PaymentChannelGenerateCreatorClaimSignature',
               requiredFields: ['amount', 'channelIDField', 'destination'],
               validators: [
                    this.walletCredentialRequired(),
                    this.positiveAmount('amount'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.isValidAddress('destination.address'),
                    // this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeeded('destination'),

                    this.optionalNumeric('channelIDField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // UpdateAccountFlags Actions
          this.registerRule({
               transactionType: 'UpdateAccountFlags',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    ctx => {
                         if (ctx.inputs['modifyAccountFlags']['setFlags']) {
                              if (ctx.inputs['modifyAccountFlags']['setFlags'].includes(6) && ctx.inputs['modifyAccountFlags']['setFlags'].includes(7)) {
                                   return 'NoFreeze and GlobalFreeze cannot be enabled at the same time.';
                              }
                         }
                         return null;
                    },

                    ctx => {
                         if (ctx.inputs['modifyAccountFlags']['setFlags'].length === 0 && ctx.inputs['modifyAccountFlags']['clearFlags'].length === 0) {
                              return 'Set Flags and Clear Flags length is 0. No flags selected for update.';
                         }
                         return null;
                    },
               ],
          });

          // UpdateMetaData Actions
          this.registerRule({
               transactionType: 'UpdateMetaData',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // At least one field must be changed (otherwise no-op)
                    ctx => {
                         const { tickSize, transferRate, domain } = ctx.inputs['updateMetaData'] || {};
                         if ((tickSize === '' || tickSize == null) && (transferRate === '' || transferRate == null) && (domain === '' || domain == null)) {
                              return 'At least one metadata field (TickSize, TransferRate, or Domain) must be provided to update.';
                         }
                         return null;
                    },

                    // TickSize: 0 (disable) or 3–15
                    ctx => {
                         const tick = ctx.inputs['updateMetaData']?.tickSize;
                         if (tick == null || tick === '') return null;

                         const value = Number.parseInt(tick, 10);
                         if (Number.isNaN(value)) {
                              return 'TickSize must be a valid integer.';
                         }
                         if (value !== 0 && (value < 3 || value > 15)) {
                              return 'TickSize must be 0 (to disable) or between 3 and 15 inclusive.';
                         }
                         return null;
                    },

                    // TransferRate: 0%–100% → 1_000_000_000 to 2_000_000_000 (or 0 to disable)
                    ctx => {
                         const rateStr = ctx.inputs['updateMetaData']?.transferRate;
                         if (rateStr == null || rateStr === '') return null;

                         try {
                              // Assuming percentToTransferRate is your helper (e.g. "0.5%" → 1000000000 + fee)
                              const transferRate = percentToTransferRate(rateStr + '%');

                              if (transferRate === 0) return null; // disable is allowed

                              if (transferRate < 1_000_000_000 || transferRate > 2_000_000_000) {
                                   return 'TransferRate must be between 0% (disable) and 100% inclusive.';
                              }
                         } catch (error: any) {
                              console.error(`Error validating transfer rate: ${error.message}`);
                              return 'Invalid transfer rate format. Use a percentage (e.g. 0.3% or 100%).';
                         }
                         return null;
                    },

                    // Domain validation – accepts plain text or hex
                    ctx => {
                         const domainInput = ctx.inputs['updateMetaData']?.domain?.trim();
                         if (!domainInput) return null; // empty = clear domain → allowed

                         // Helper: check if input looks like raw hex
                         const isHex = /^[0-9A-Fa-f]+$/.test(domainInput);

                         let hexValue: string;

                         if (isHex) {
                              // Treat as hex
                              hexValue = domainInput.toUpperCase();

                              // Length limit: max 256 bytes = 512 hex chars
                              if (hexValue.length > 512) {
                                   return 'Domain hex is too long (maximum 512 hex characters / 256 bytes).';
                              }

                              // Optional: must be even length (bytes)
                              if (hexValue.length % 2 !== 0) {
                                   return 'Domain hex must have an even number of characters.';
                              }

                              // Try to decode to warn about invalid UTF-8 early
                              try {
                                   const decoded = xrpl.convertHexToString(hexValue);
                                   if (new TextEncoder().encode(decoded).length > 256) {
                                        return 'Decoded domain exceeds 256 bytes (XRPL limit).';
                                   }
                              } catch (error: any) {
                                   console.error(`Invalid hex domain cannot decode to valid UTF-8 string. Error: ${error.message}`);
                                   return 'Invalid hex domain: cannot decode to valid UTF-8 string.';
                              }
                         } else {
                              // Treat as plain text → encode to hex
                              try {
                                   hexValue = xrpl.convertStringToHex(domainInput);

                                   // Check encoded length
                                   if (hexValue.length > 512) {
                                        return `Domain is too long after encoding (${domainInput.length} characters → ${hexValue.length / 2} bytes). Maximum is 256 bytes.`;
                                   }
                              } catch (error: any) {
                                   console.error(`Invalid domain string: cannot encode to valid hex. Error: ${error.message}`);
                                   return 'Invalid domain string: cannot encode to valid hex.';
                              }
                         }

                         // If we got here → valid in either format
                         return null;
                    },

                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // SetDepositAuthAccounts Actions
          this.registerRule({
               transactionType: 'SetDepositAuthAccounts',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // List cannot be empty if authorizing
                    ctx => {
                         const entries = ctx.inputs['modifyDepositAuth']?.depsositAuthEntries || [];
                         if (entries.length === 0 && ctx.inputs['modifyDepositAuth']?.authorizeFlag === 'Y') {
                              return 'At least one address must be provided when authorizing.';
                         }
                         return null;
                    },

                    // Validate each address format + no self-authorization
                    ctx => {
                         const entries = ctx.inputs['modifyDepositAuth']?.depsositAuthEntries || [];
                         const selfAddr = ctx.accountInfo?.result?.account_data?.Account;

                         for (const [index, entry] of entries.entries()) {
                              const addr = entry?.Account?.trim();
                              if (!addr) {
                                   return `Deposit auth address #${index + 1}: missing or empty.`;
                              }

                              if (!xrpl.isValidClassicAddress(addr)) {
                                   return `Deposit auth address #${index + 1}: "${addr}" is not a valid XRPL classic address.`;
                              }

                              if (selfAddr && addr === selfAddr) {
                                   return `Cannot ${ctx.inputs['modifyDepositAuth'].authorizeFlag === 'Y' ? 'authorize' : 'unauthorize'} the account itself (${addr}).`;
                              }
                         }
                         return null;
                    },

                    // Check for duplicates in the submitted list
                    ctx => {
                         const entries = ctx.inputs['modifyDepositAuth']?.depsositAuthEntries || [];
                         const seen = new Set<string>();

                         for (const [_index, entry] of entries.entries()) {
                              const addr = entry?.Account?.trim();
                              if (addr && seen.has(addr)) {
                                   return `Duplicate address detected: ${addr} (appears multiple times in the list).`;
                              }
                              if (addr) seen.add(addr);
                         }
                         return null;
                    },

                    // Existing preauth checks (already good, but cleaner)
                    ctx => {
                         const entries = ctx.inputs['modifyDepositAuth']?.depsositAuthEntries || [];
                         const authorize = ctx.inputs['modifyDepositAuth']?.authorizeFlag === 'Y';
                         const accountObjects = ctx.inputs['network']?.accountObjects?.result?.account_objects || [];

                         for (const entry of entries) {
                              const addr = entry?.Account?.trim();
                              if (!addr) continue;

                              const alreadyAuthorized = accountObjects.some((obj: any) => obj.LedgerEntryType === 'DepositPreauth' && obj.Authorize === addr);

                              if (authorize && alreadyAuthorized) {
                                   return `Address ${addr} is already preauthorized (tecDUPLICATE). Use Unauthorize instead.`;
                              }
                              if (!authorize && !alreadyAuthorized) {
                                   return `No preauthorization exists for ${addr} — nothing to unauthorize.`;
                              }
                         }
                         return null;
                    },

                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),

                    // Remove this — multi-sign unrelated
                    this.multiSign(),
               ],
          });

          // SetMultiSign Actions
          this.registerRule({
               transactionType: 'SetMultiSign',
               requiredFields: ['modifyMultiSigners.formattedSignerEntries', 'modifyMultiSigners.signerQuorum'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         // Validate each address
                         if (ctx.inputs['modifyMultiSigners']['formattedSignerEntries'].length < 1) {
                              return `Multi signers list cannot be empty.`;
                         }
                         return null;
                    },

                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];

                         if (entries.length === 0) return null; // already checked by "cannot be empty"

                         for (const [index, entry] of entries.entries()) {
                              const addr = entry?.SignerEntry?.Account?.trim();

                              if (!addr) {
                                   return `Signer at position ${index + 1}: missing or empty Account address.`;
                              }

                              // Use xrpl.js official validation
                              if (!xrpl.isValidClassicAddress(addr)) {
                                   return `Signer at position ${index + 1}: "${addr}" is not a valid XRPL classic address (checksum failed or malformed).`;
                              }

                              // Bonus: Prevent adding the account itself as a signer
                              const selfAddress = ctx.accountInfo?.result?.account_data?.Account;
                              if (selfAddress && addr === selfAddress) {
                                   return `Signer at position ${index + 1}: cannot add the account itself (${addr}) as one of its own signers (creates a dangerous loop).`;
                              }
                         }

                         return null;
                    },

                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];

                         const seen = new Map<string, number>(); // address → first occurrence index

                         for (let i = 0; i < entries.length; i++) {
                              const account = entries[i]?.SignerEntry?.Account?.trim();
                              if (!account) continue;

                              if (seen.has(account)) {
                                   const firstIndex = seen.get(account)!;
                                   return `Duplicate signer address detected: ${account} (appears at signers ${firstIndex + 1} and ${i + 1})`;
                              }
                              seen.set(account, i);
                         }

                         return null;
                    },

                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         if (entries.length > 8) {
                              return `Signer list cannot have more than 8 entries (XRPL maximum is 8). You have ${entries.length}.`;
                         }
                         return null;
                    },

                    // All entries must have exactly the expected shape
                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         for (const [i, entry] of entries.entries()) {
                              if (!entry?.SignerEntry) {
                                   return `Invalid format at position ${i + 1}: missing SignerEntry object`;
                              }
                              if (!entry.SignerEntry.Account || typeof entry.SignerEntry.Account !== 'string') {
                                   return `Invalid address at position ${i + 1}: missing or invalid Account`;
                              }
                              if (!('SignerWeight' in entry.SignerEntry)) {
                                   return `Missing SignerWeight at position ${i + 1}`;
                              }
                         }
                         return null;
                    },

                    // All weights must be positive integers
                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         for (const [i, entry] of entries.entries()) {
                              const weight = Number(entry?.SignerEntry?.SignerWeight);
                              if (!Number.isInteger(weight) || weight <= 0) {
                                   return `Signer weight at position ${i + 1} must be a positive integer (found: ${entry.SignerEntry.SignerWeight})`;
                              }
                         }
                         return null;
                    },

                    // Quorum must be > 0 and <= total weight
                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         const quorum = Number(ctx.inputs['modifyMultiSigners']['signerQuorum']);

                         if (quorum <= 0) {
                              return 'Quorum must be greater than 0';
                         }

                         const totalWeight = entries.reduce((sum: number, e: { SignerEntry: { SignerWeight: any } }) => sum + Number(e?.SignerEntry?.SignerWeight || 0), 0);

                         if (quorum > totalWeight) {
                              return `Quorum (${quorum}) cannot be higher than total signer weight (${totalWeight})`;
                         }

                         return null;
                    },

                    // Warn/recommend quorum ≤ totalWeight / 2 + 1 (soft warning, optional)
                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         const quorum = Number(ctx.inputs['modifyMultiSigners']['signerQuorum']);
                         const total = entries.reduce((sum: number, e: { SignerEntry: { SignerWeight: any } }) => sum + Number(e?.SignerEntry?.SignerWeight || 0), 0);

                         if (quorum > Math.floor(total / 2) + 1) {
                              return `Warning: Quorum (${quorum}) is high relative to total weight (${total}). This makes it harder to reach agreement. Consider lowering it.`;
                         }
                         return null;
                    },

                    // Cannot add the account itself as a signer (creates dangerous loop)
                    ctx => {
                         const entries = ctx.inputs['modifyMultiSigners']['formattedSignerEntries'] || [];
                         const selfAddress = ctx.accountInfo?.result?.account_data?.Account;

                         if (!selfAddress) return null;

                         const found = entries.some((e: { SignerEntry: { Account: any } }) => e?.SignerEntry?.Account === selfAddress);
                         if (found) {
                              return 'The account itself cannot be added as one of its own signers.';
                         }
                         return null;
                    },

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // SetRegularKey Actions
          this.registerRule({
               transactionType: 'SetRegularKey',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         if (this.accountConfiguratorStoreService.regularKeyAddress() === '' || this.accountConfiguratorStoreService.regularKeyAddress() === 'No RegularKey configured for account' || this.accountConfiguratorStoreService.regularKeySeed() === '') {
                              return `Regular Key address and seed must be present`;
                         }
                         return null;
                    },

                    ctx => {
                         const addr = this.accountConfiguratorStoreService.regularKeyAddress()?.trim();
                         if (!addr) return null; // empty → handled by earlier required check

                         // Use official XRPL validation
                         if (!this.xrplWrapperService.isValidAddress(addr)) {
                              return 'Invalid Regular Key address: not a valid XRPL classic address (checksum failed or malformed).';
                         }

                         // Bonus: prevent self-reference (still good to keep)
                         const accountAddr = ctx.accountInfo?.result?.account_data?.Account;
                         if (accountAddr && addr === accountAddr) {
                              return 'The Regular Key cannot be the same as the account address itself (would create a dangerous loop).';
                         }

                         return null;
                    },

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // SetNftMinterAddress Actions
          this.registerRule({
               transactionType: 'SetNftMinterAddress',
               requiredFields: ['modifyMetaData.nfTokenMinterAddress'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Validate NFTokenMinter address (only required when enabling)
                    ctx => {
                         const addr = ctx.inputs['modifyMetaData']?.nfTokenMinterAddress?.trim();
                         const isEnable = ctx.inputs['modifyMetaData']?.enableNftMinter === 'Y'; // assuming you have this flag

                         if (!isEnable) return null; // removing minter → no address needed

                         if (!addr) {
                              return 'NFTokenMinter address is required when enabling the authorized minter.';
                         }

                         if (!xrpl.isValidClassicAddress(addr)) {
                              return `Invalid NFTokenMinter address: "${addr}" is not a valid XRPL classic address.`;
                         }

                         const selfAddr = ctx.accountInfo?.result?.account_data?.Account;
                         if (selfAddr && addr === selfAddr) {
                              return 'Cannot set the account itself as its own authorized NFToken minter (loop risk).';
                         }

                         return null;
                    },

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // SellNft Actions
          this.registerRule({
               transactionType: 'SellNft',
               // requiredFields: ['sellNft.nftId'],
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // BuyNft Actions
          this.registerRule({
               transactionType: 'BuyNft',
               // requiredFields: ['buyNft.nftId', 'buyNft.nftOfferId'],
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // BuyNftOffer Actions
          this.registerRule({
               transactionType: 'BuyNftOffer',
               // requiredFields: ['buyNftOffer.nftId', 'buyNftOffer.nftOfferId'],
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // SellNftOffer Actions
          this.registerRule({
               transactionType: 'SellNftOffer',
               // requiredFields: ['sellNftOffer.nftId', 'sellNftOffer.nftOfferId'],
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CancelNftOffer Actions
          this.registerRule({
               transactionType: 'CancelNftOffer',
               // requiredFields: ['cancelNftOffer.nftOfferId'],
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CreateNft Actions
          this.registerRule({
               transactionType: 'CreateNft',
               requiredFields: ['createNft.taxon'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.validNftTaxon(),
                    this.validTransferFee(),
                    this.validNftMinter(),
                    this.validNftUri(),
                    this.nftFlagsConsistency(),
                    this.validNftExpiration(),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // BurnNft Actions
          this.registerRule({
               transactionType: 'BurnNft',
               requiredFields: ['burnNft.nftId'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         const nftId = ctx.inputs['burnNft']?.nftId?.trim();
                         if (!nftId) return null;
                         if (nftId.length !== 64 || !/^[0-9A-Fa-f]{64}$/.test(nftId)) {
                              return 'NFT ID must be a valid 64-character hex string';
                         }
                         return null;
                    },

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // UpdateNFTMetadata Actions
          this.registerRule({
               transactionType: 'UpdateNFTMetadata',
               requiredFields: ['updateNFTMetadata.nftId'],
               validators: [
                    this.walletCredentialRequired(),
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    ctx => {
                         const nftId = ctx.inputs['updateNFTMetadata']?.nftId?.trim();
                         if (nftId?.length !== 64 || !/^[0-9A-Fa-f]{64}$/.test(nftId)) {
                              return 'NFT ID must be a valid 64-character hex string';
                         }
                         return null;
                    },

                    // Add URI or other metadata validation if your update supports it
                    this.validNftUri(),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // TrustSet
          this.registerRule({
               transactionType: 'TrustSet',
               requiredFields: ['setTrustline.amount', 'setTrustline.currencyCode', 'setTrustline.currencyIssuer'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('setTrustline'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // RemoveTrustline
          this.registerRule({
               transactionType: 'RemoveTrustline',
               requiredFields: ['removeTrustline.amount', 'removeTrustline.currencyCode', 'removeTrustline.currencyIssuer'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
                    this.isValidAddress('issuer'),
               ],
          });

          // IssueCurrency
          this.registerRule({
               transactionType: 'IssueCurrency',
               requiredFields: ['issueCurrency.destination', 'issueCurrency.amount', 'issueCurrency.currencyCode', 'issueCurrency.currencyIssuer'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('issueCurrency'),
                    // Destination address valid
                    this.isValidAddress('issueCurrency.destination'),
                    this.requireDestinationTagIfNeeded('issueCurrency'),

                    this.validDestinationTag('issueCurrency'),
                    this.validSourceTag('issueCurrency'),
                    this.validInvoiceId('issueCurrency'),

                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('issueCurrency'),
               ],
          });

          // ClawbackTokens
          this.registerRule({
               transactionType: 'ClawbackTokens',
               requiredFields: ['clawbackTokens.destination', 'clawbackTokens.amount', 'clawbackTokens.currencyCode', 'clawbackTokens.currencyIssuer'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('clawbackTokens'),
                    // Destination address valid
                    this.isValidAddress('clawbackTokens.destination'),
                    this.requireDestinationTagIfNeeded('clawbackTokens'),

                    this.validDestinationTag('clawbackTokens'),
                    this.validSourceTag('clawbackTokens'),
                    this.validInvoiceId('clawbackTokens'),

                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('clawbackTokens'),
               ],
          });

          // EscrowOwner
          this.registerRule({
               transactionType: 'EscrowOwner',
               requiredFields: ['destination'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },
                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.isValidAddress('destination.address'),
               ],
          });

          // CreateEscrow
          this.registerRule({
               transactionType: 'CreateEscrow',
               requiredFields: ['createEscrow.amount', 'createEscrow.destination'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('createEscrow'),

                    ctx => {
                         if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate()) {
                              this.validateDate('createEscrow', 'finishAfter');
                         }

                         if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate()) {
                              this.validateDate('createEscrow', 'cancelAfter');
                         }
                         return null;
                    },

                    ctx => {
                         if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.escrowStoreService.enableEscrowFinishAfterExpirationDate()) {
                              const finishAfter = new Date(ctx.inputs['createEscrow'].finishAfter).getTime();
                              const cancelAfter = new Date(ctx.inputs['createEscrow'].cancelAfter).getTime();
                              if (finishAfter && cancelAfter && finishAfter >= cancelAfter) {
                                   return 'Finish After must be before Cancel After';
                              }
                         }
                         return null;
                    },
                    this.isValidAddress('createEscrow.destination'),
                    this.requireDestinationTagIfNeeded('createEscrow'),

                    this.validDestinationTag('createEscrow'),
                    this.optionalNumeric('destinationTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('CreateEscrow'),
               ],
          });

          // FinishEscrow
          this.registerRule({
               transactionType: 'FinishEscrow',
               requiredFields: ['finishEscrow.escrowSequenceNumber', 'finishEscrow.escrowSequenceNumber'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('escrowSequenceNumber', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CancelEscrow
          this.registerRule({
               transactionType: 'CancelEscrow',
               requiredFields: ['cancelEscrow.escrowSequenceNumber'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('escrowSequenceNumber', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CreateTimeBasedEscrow
          this.registerRule({
               transactionType: 'CreateTimeBasedEscrow',
               requiredFields: ['createTimeBasedEscrow.amount', 'createTimeBasedEscrow.destination', 'createTimeBasedEscrow.finishAfter', 'createTimeBasedEscrow.cancelAfter'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('createTimeBasedEscrow'),

                    // if (this.txUiService.enableEscrowFinishAfterExpirationDate() {
                    this.validateDate('createTimeBasedEscrow', 'finishAfter'),
                    // },
                    // if (this.txUiService.enableEscrowCancelAfterExpirationDate() ) {
                    // this.validateDate('createTimeBasedEscrow', 'cancelAfter'),
                    // },
                    ctx => {
                         if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.escrowStoreService.enableEscrowFinishAfterExpirationDate()) {
                              const finishAfter = new Date(ctx.inputs['createTimeBasedEscrow'].finishAfter).getTime();
                              const cancelAfter = new Date(ctx.inputs['createTimeBasedEscrow'].cancelAfter).getTime();
                              if (finishAfter && cancelAfter && finishAfter >= cancelAfter) {
                                   return 'Finish After must be before Cancel After';
                              }
                         }
                         return null;
                    },
                    this.isValidAddress('createTimeBasedEscrow.destination'),
                    this.requireDestinationTagIfNeeded('createTimeBasedEscrow'),

                    this.validDestinationTag('createTimeBasedEscrow'),
                    this.optionalNumeric('destinationTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId('createTimeBasedEscrow'),
               ],
          });

          // FinishTimeBasedEscrow
          this.registerRule({
               transactionType: 'FinishTimeBasedEscrow',
               requiredFields: ['finishTimeBasedEscrow.escrowSequenceNumberField', 'finishTimeBasedEscrow.escrowSequenceNumberField'],
               validators: [
                    // this.positiveAmount(),
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      if (ctx.inputs['seed']) {
                    //           const { value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('escrowSequenceNumberField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CancelTimeBasedEscrow
          this.registerRule({
               transactionType: 'CancelTimeBasedEscrow',
               requiredFields: ['cancelTimeBasedEscrow.escrowSequenceNumberField'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('escrowSequenceNumberField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CreateConditionalEscrow
          this.registerRule({
               transactionType: 'CreateConditionalEscrow',
               requiredFields: ['createConditionalEscrow.amount', 'createConditionalEscrow.destination', 'createConditionalEscrow.finishAfter', 'createConditionalEscrow.cancelAfter', 'createConditionalEscrow.condition'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.positiveAmount('createConditionalEscrow'),
                    // this.validateDate('createConditionalEscrow', 'finishAfter'),
                    // this.validateDate('createConditionalEscrow', 'cancelAfter'),
                    // ctx => {
                    //      const finishAfter = new Date(ctx.inputs['createConditionalEscrow'].finishAfter).getTime();
                    //      const cancelAfter = new Date(ctx.inputs['createConditionalEscrow'].cancelAfter).getTime();
                    //      if (finishAfter && cancelAfter && finishAfter >= cancelAfter) {
                    //           return 'Finish After must be before Cancel After';
                    //      }
                    //      return null;
                    // },
                    this.isValidAddress('createConditionalEscrow.destination'),
                    this.requireDestinationTagIfNeeded('createConditionalEscrow'),

                    this.validDestinationTag('createConditionalEscrow'),
                    this.optionalNumeric('destinationTag', 0),

                    // // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // // Ticket validation
                    this.ticketValidation(),

                    // // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // FinishConditionalEscrow
          this.registerRule({
               transactionType: 'FinishConditionalEscrow',
               requiredFields: ['finishConditionalEscrow.escrowOwner', 'finishConditionalEscrow.escrowSequenceNumberField', 'finishConditionalEscrow.condition', 'finishConditionalEscrow.fulfillment'],
               validators: [
                    this.walletCredentialRequired(),
                    // ctx => {
                    //      const seed = this.getSeed(ctx);
                    //      if (seed) {
                    //           const { value } = this.utilsService.detectXrpInputType(seed);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('escrowSequenceNumberField', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // CreateMpt
          this.registerRule({
               transactionType: 'CreateMpt',
               requiredFields: ['createMpt.amount'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    this.optionalNumeric('amount', 0),

                    ctx => {
                         if (ctx.inputs['createMpt']?.assetScaleField) {
                              this.isValidNumber('assetScaleField', 'Asset scale', 0, 15);
                         }
                         return null;
                    },

                    ctx => {
                         if (ctx.inputs['createMpt']?.transferFeeField) {
                              this.isValidNumber('transferFeeField', 'Transfer fee', 0, 50000);
                         }
                         return null;
                    },

                    this.positiveAmount('createMpt'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // AuthorizeMpt
          this.registerRule({
               transactionType: 'AuthorizeMpt',
               requiredFields: ['authorizeMpt.mptIssuanceId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // UnauthorizeMpt
          this.registerRule({
               transactionType: 'UnauthorizeMpt',
               requiredFields: ['unauthorizeMpt.mptIssuanceId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // SendMpt
          this.registerRule({
               transactionType: 'SendMpt',
               requiredFields: ['sendMpt.mptIssuanceId', 'sendMpt.destination', 'sendMpt.amount'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // LockMpt
          this.registerRule({
               transactionType: 'LockMpt',
               requiredFields: ['lockMpt.mptIssuanceId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // UnlockMpt
          this.registerRule({
               transactionType: 'UnlockMpt',
               requiredFields: ['unlockMpt.mptIssuanceId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // ClawbackMpt
          this.registerRule({
               transactionType: 'ClawbackMpt',
               requiredFields: ['clawbackMpt.mptIssuanceId', 'clawbackMpt.destination', 'clawbackMpt.amount'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // DestroyMpt
          this.registerRule({
               transactionType: 'DestroyMpt',
               requiredFields: ['destroyMpt.mptIssuanceId'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),
               ],
          });

          // OfferCreate
          this.registerRule({
               transactionType: 'OfferCreate',
               requiredFields: ['weWantAmountField', 'weSpendAmountField', 'weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    this.positiveNumber('weWantAmountField'),
                    this.positiveNumber('weSpendAmountField'),
                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.notSelfOffer('weWantIssuerField'),
                    this.notSelfOffer('weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled check
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation
                    this.multiSign(),
               ],
          });

          // OfferCancel
          this.registerRule({
               transactionType: 'OfferCancel',
               requiredFields: ['offerSequenceField'],
               validators: [
                    this.validOfferSequences('offerSequenceField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation
                    this.multiSign(),
               ],
          });

          // For read-only or utility actions (not real transactions)
          this.registerRule({
               transactionType: 'GetOrderBook',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [this.validCurrency('weWantCurrencyField'), this.validCurrency('weSpendCurrencyField'), this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'), this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'), this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'), this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField')],
          });

          // CreateAMM
          this.registerRule({
               transactionType: 'CreateAMM',
               requiredFields: ['firstPoolAssetAmount', 'secondPoolAssetAmount', 'firstPoolCurrencyField', 'secondPoolCurrencyField', 'tradingFeeField'],
               validators: [
                    this.positiveNumber('firstPoolAssetAmount'),
                    this.positiveNumber('secondPoolAssetAmount'),
                    this.numeric('tradingFeeField', { min: 0, max: 1000 }),

                    this.validCurrency('firstPoolCurrencyField'),
                    this.validCurrency('secondPoolCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('firstPoolCurrencyField', 'firstPoolIssuerField'),
                    this.requireIssuerIfNotXRP('secondPoolCurrencyField', 'secondPoolIssuerField'),
                    this.validIssuerIfProvided('firstPoolCurrencyField', 'firstPoolIssuerField'),
                    this.validIssuerIfProvided('secondPoolCurrencyField', 'secondPoolIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // DepositToAMM
          this.registerRule({
               transactionType: 'DepositToAMM',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    // At least one amount must be provided
                    this.requireAtLeastOneAmountForDeposit(),

                    // Validate amounts only if provided
                    ctx => (ctx.inputs['weWantAmountField'] ? this.positiveNumber('weWantAmountField')(ctx) : null),
                    ctx => (ctx.inputs['weSpendAmountField'] ? this.positiveNumber('weSpendAmountField')(ctx) : null),

                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // WithdrawalFromAMM
          this.registerRule({
               transactionType: 'WithdrawalFromAMM',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    // You can optionally require LP token amount
                    // this.validLpTokenAmount('lpTokenAmountField'),

                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    // Optional: validate requested amounts if user specifies them
                    ctx => (ctx.inputs['weWantAmountField'] ? this.positiveNumber('weWantAmountField')(ctx) : null),
                    ctx => (ctx.inputs['weSpendAmountField'] ? this.positiveNumber('weSpendAmountField')(ctx) : null),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // VoteAMM (for changing trading fee)
          this.registerRule({
               transactionType: 'VoteAMM',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField', 'tradingFeeField'],
               validators: [
                    this.numeric('tradingFeeField', { min: 0, max: 1000 }),
                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // BidAMM (optional – for auction slot)
          this.registerRule({
               transactionType: 'BidAMM',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // DeleteAMM (only allowed if pool is empty)
          this.registerRule({
               transactionType: 'DeleteAMM',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // ClawbackAMM – only allowed if the account has the clawback flag set
          this.registerRule({
               transactionType: 'ClawbackAMM',
               requiredFields: [
                    'lpTokenAmountField', // amount of LP tokens to claw back
                    'weWantCurrencyField',
                    'weSpendCurrencyField',
               ],
               validators: [
                    this.positiveNumber('lpTokenAmountField'),

                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    // Only the issuer of the LP token can claw back
                    ctx => {
                         const flags = ctx.accountInfo?.result?.account_flags;
                         if (!flags?.clawbackEnabled) {
                              return 'Clawback is not enabled only if the account has the lsfClawback flag set';
                         }
                         return null;
                    },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // SwapViaAMM – uses a Payment with DeliverMin or Amount + Path (but we treat it separately in UI)
          this.registerRule({
               transactionType: 'SwapViaAMM',
               requiredFields: ['weWantAmountField', 'weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [
                    this.positiveNumber('weWantAmountField'),

                    // Optional: max spend amount (SendMax field)
                    ctx => (ctx.inputs['weSpendAmountField'] ? this.positiveNumber('weSpendAmountField')(ctx) : null),

                    this.validCurrency('weWantCurrencyField'),
                    this.validCurrency('weSpendCurrencyField'),
                    this.requireCurrencyPair(),

                    this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'),
                    this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'),
                    this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'),
                    this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField'),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),
                    this.masterKeyDisabledRequiresAltSigning(),
                    this.ticketValidation(),
                    ...this.regularKeySigningValidation(),
                    this.multiSign(),
               ],
          });

          // For getPoolInfo / swap preview etc.
          this.registerRule({
               transactionType: 'GetPoolInfo',
               requiredFields: ['weWantCurrencyField', 'weSpendCurrencyField'],
               validators: [this.validCurrency('weWantCurrencyField'), this.validCurrency('weSpendCurrencyField'), this.requireCurrencyPair(), this.requireIssuerIfNotXRP('weWantCurrencyField', 'weWantIssuerField'), this.requireIssuerIfNotXRP('weSpendCurrencyField', 'weSpendIssuerField'), this.validIssuerIfProvided('weWantCurrencyField', 'weWantIssuerField'), this.validIssuerIfProvided('weSpendCurrencyField', 'weSpendIssuerField')],
          });
     }
}
