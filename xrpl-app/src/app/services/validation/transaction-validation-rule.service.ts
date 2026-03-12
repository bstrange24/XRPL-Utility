import { inject, Injectable } from '@angular/core';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import * as xrpl from 'xrpl';
import didSchema from '../../components/did/did-schema.json';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { percentToTransferRate } from 'xrpl';

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

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService
     ) {
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
          if (rule.requiredFields) {
               for (const field of rule.requiredFields) {
                    const value = this.getValueByPath(context.inputs, field);
                    if (value === undefined || value === null || value === '') {
                         if (this.capitalize(field.split('.')[1]) === 'Nf Token Minter Address') {
                              errors.push(`NFT Minter Address is required`);
                         } else {
                              errors.push(`${this.capitalize(field.split('.')[1])} is required`);
                         }
                    }
               }
          }

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

     private requireField(field: string, message?: string): ValidatorFn {
          return ctx => (ctx.inputs[field] ? null : message || `${this.capitalize(field)} is required`);
     }

     private isValidAddress(field: string): ValidatorFn {
          return ctx => {
               const value = this.getValueByPath(ctx.inputs, field);
               if (value && !xrpl.isValidAddress(value)) {
                    return 'Invalid XRP Address';
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
                    // const info = await this.xrplService.getAccountInfo(ctx.client, dest as string, 'validated', '');
                    if (ctx.accountInfo.result.account_flags?.requireDestinationTag && !ctx.inputs['destinationTag']) {
                         // if (info.result.account_flags?.requireDestinationTag && !ctx.inputs['destinationTag']) {
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

               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
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

     private requireIf(condition: (ctx: ValidationContext) => boolean, field: string, message?: string): ValidatorFn {
          return ctx => (condition(ctx) && !ctx.inputs[field] ? message || `${this.capitalize(field)} is required` : null);
     }

     private validAddressIf(condition: (ctx: ValidationContext) => boolean, field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               return condition(ctx) && value && !xrpl.isValidAddress(value) ? `${this.capitalize(field)} is not a valid XRP address` : null;
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

               // CORRECT paths based on your getValidationInputs()
               const usingRegularKey = !!ctx.inputs['regularKey']?.isRegularKey;
               const usingMultiSign = !!ctx.inputs['multiSign']?.enabled;

               if (disableMaster && !usingRegularKey && !usingMultiSign) {
                    return 'Master key is disabled. Must sign with Regular Key or Multi-sign.';
               }
               return null;
          };
     }

     private masterKeyDisabledRequiresAltSigning1(): ValidatorFn {
          return ctx => {
               const flags = ctx.accountInfo?.result?.account_flags;
               const disableMaster = flags?.disableMasterKey === true;
               const usingRegularKey = !!ctx.inputs['isRegularKeyAddress'];
               const usingMultiSign = !!ctx.inputs['useMultiSign'];

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
                    value = ctx.inputs[action]?.ticketCountField;
                    field = 'Ticket Count';
               } else if (action === 'createMpt') {
                    value = ctx.inputs[action]?.tokenCountField;
                    field = 'Ticket Count';
               } else if (action === 'issueCurrency' || action === 'clawbackTokens' || action === 'setTrustline') {
                    value = ctx.inputs[action]?.trustlineLimitField;
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
               const result = this.utilsService.validateAndConvertDidJson(data, didSchema);
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
               if (currency && currency !== 'XRP' && issuer && !xrpl.isValidAddress(issuer)) {
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
               const want = ctx.inputs['firstPoolCurrencyField'];
               const spend = ctx.inputs['secondPoolCurrencyField'];
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
                         this.isValidAddress(ctx['inputs']['destination']);
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
               requiredFields: ['createTicket.ticketCountField'],
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
               requiredFields: ['permissionedDomainSet.subject', 'permissionedDomainSet.credentialType'],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    this.isValidAddress('permissionedDomainSet.subject'),
                    // this.notSelf('senderAddress', 'subject.address'),
                    this.requireDestinationTagIfNeeded('permissionedDomainSet'),

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
               ],
          });

          // CredentialAccept Actions
          this.registerRule({
               transactionType: 'CredentialAccept',
               requiredFields: ['acceptCredentials.Issuer', 'acceptCredentials.credentialType'],
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

                    this.isValidAddress('acceptCredentials.Issuer'),
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

                    // ctx => {
                    //      if (ctx.inputs['seed']) {
                    //           const { value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

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
                    // ctx => {
                    //      if (ctx.inputs['seed']) {
                    //           const { value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // Destination address valid
                    // this.isValidAddress('paymentChannelRenew.destination'),
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

                    // ctx => {
                    //      if (ctx.inputs['seed']) {
                    //           const { value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

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
                    // ctx => {
                    //      if (ctx.inputs['seed']) {
                    //           const { value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                    //           if (value === 'unknown') return 'Account seed is invalid';
                    //      }
                    //      return null;
                    // },

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

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

                    ctx => {
                         if (this.txUiService.tickSize()) {
                              const tickSize = Number.parseInt(this.txUiService.tickSize());
                              if (tickSize == 0) {
                                   return null;
                              }

                              if (tickSize < 3 || tickSize > 15) {
                                   return 'Invalid tick size. The tick size valid values are 3 to 15 inclusive, or 0 to disable';
                              }
                         }
                         return null;
                    },

                    ctx => {
                         if (this.txUiService.transferRate()) {
                              try {
                                   const transferRate = percentToTransferRate(this.txUiService.transferRate() + '%');

                                   if (transferRate === 0) {
                                        return null;
                                   }

                                   if (transferRate < 1000000000 || transferRate > 2000000000) {
                                        return `Invalid transfer rate. Must be between 0% (no fee) and 100% inclusive.`;
                                   }
                              } catch (error) {
                                   console.error('Error parsing transfer rate:', error);
                                   return `Invalid transfer rate. Must be between 0% (no fee) and 100% inclusive.`;
                              }
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

          // SetDepositAuthAccounts Actions
          this.registerRule({
               transactionType: 'SetDepositAuthAccounts',
               requiredFields: [],
               validators: [
                    this.walletCredentialRequired(),

                    ctx => (ctx.accountInfo ? null : 'Account info not loaded'),

                    // ctx => {
                    //      // Validate each address
                    //      for (const authorizedAddress of ctx.inputs['modifyDepositAuth'].depsositAuthEntries) {
                    //           // Check for existing preauthorization
                    //           const alreadyAuthorized = ctx.inputs['network']['accountObjects'].result.account_objects.some((obj: any) => obj.Authorize === authorizedAddress.Account);
                    //           if (ctx.inputs['modifyDepositAuth']['authorizeFlag'] === 'Y' && alreadyAuthorized) {
                    //                return `Preauthorization already exists for ${authorizedAddress.Account} (tecDUPLICATE).\nUse Unauthorize to remove.`;
                    //           }
                    //           if (ctx.inputs['modifyDepositAuth']['authorizeFlag'] === 'N' && !alreadyAuthorized) {
                    //                return `No preauthorization exists for ${authorizedAddress.Account}`;
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

                         for (const authorizedAddress of ctx.inputs['modifyDepositAuth'].depsositAuthEntries) {
                              // Check for existing preauthorization
                              const alreadyAuthorized = ctx.inputs['network']['accountObjects'].result.account_objects.some((obj: any) => obj.Authorize === authorizedAddress.Account);
                              if (ctx.inputs['modifyDepositAuth']['authorizeFlag'] === 'Y' && alreadyAuthorized) {
                                   return `Preauthorization already exists for ${authorizedAddress.Account} (tecDUPLICATE).\nUse Unauthorize to remove.`;
                              }
                              if (ctx.inputs['modifyDepositAuth']['authorizeFlag'] === 'N' && !alreadyAuthorized) {
                                   return `No preauthorization exists for ${authorizedAddress.Account}`;
                              }
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
                         if (this.txUiService.regularKeyAddress() === '' || this.txUiService.regularKeyAddress() === 'No RegularKey configured for account' || this.txUiService.regularKeySeed() === '') {
                              return `Regular Key address and seed must be present`;
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
               requiredFields: ['setTrustline.trustlineLimitField', 'setTrustline.currencyCode', 'setTrustline.currencyIssuer'],
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
               requiredFields: ['removeTrustline.trustlineLimitField', 'removeTrustline.currencyCode', 'removeTrustline.currencyIssuer'],
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
               requiredFields: ['issueCurrency.destination', 'issueCurrency.trustlineLimitField', 'issueCurrency.currencyCode', 'issueCurrency.currencyIssuer'],
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
               requiredFields: ['clawbackTokens.destination', 'clawbackTokens.trustlineLimitField', 'clawbackTokens.currencyCode', 'clawbackTokens.currencyIssuer'],
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
                         if (this.txUiService.enableEscrowCancelAfterExpirationDate() && this.txUiService.enableEscrowFinishAfterExpirationDate()) {
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

          // MptCreate
          this.registerRule({
               transactionType: 'MptCreate',
               requiredFields: ['createMpt.tokenCountField'],
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

                    this.optionalNumeric('tokenCountField', 0),

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

                    ctx => {
                         if (ctx.inputs['createMpt']?.tokenCountField) {
                              this.isValidNumber('tokenCountField', 'Token Count', 0);
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

          // MptAuthorize
          this.registerRule({
               transactionType: 'MptAuthorize',
               requiredFields: ['authorizeMpt.mptIssuanceIdField'],
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

          // MptUnauthorize
          this.registerRule({
               transactionType: 'MptUnauthorize',
               requiredFields: ['unauthorize.mptIssuanceIdField'],
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

          // MptSend
          this.registerRule({
               transactionType: 'MptSend',
               requiredFields: ['send.mptIssuanceIdField', 'send.destinationAddress', 'send.amount'],
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

          // MptLock
          this.registerRule({
               transactionType: 'MptLock',
               requiredFields: ['lock.mptIssuanceIdField'],
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

          // MptUnlock
          this.registerRule({
               transactionType: 'MptUnlock',
               requiredFields: ['unlock.mptIssuanceIdField'],
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

          // MptClawback
          this.registerRule({
               transactionType: 'MptClawback',
               requiredFields: ['clawback.mptIssuanceIdField', 'clawback.destinationAddress', 'clawback.amount'],
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

          // MptDestroy
          this.registerRule({
               transactionType: 'MptDestroy',
               requiredFields: ['destroy.mptIssuanceIdField'],
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

          // AMMCreate
          this.registerRule({
               transactionType: 'AMMCreate',
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

          // AMMDeposit
          this.registerRule({
               transactionType: 'AMMDeposit',
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

          // AMMWithdraw
          this.registerRule({
               transactionType: 'AMMWithdraw',
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

          // AMMVote (for changing trading fee)
          this.registerRule({
               transactionType: 'AMMVote',
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

          // AMMBid (optional – for auction slot)
          this.registerRule({
               transactionType: 'AMMBid',
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

          // AMMDelete (only allowed if pool is empty)
          this.registerRule({
               transactionType: 'AMMDelete',
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

          // AMMClawback – only allowed if the account has the clawback flag set
          this.registerRule({
               transactionType: 'AMMClawback',
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

          // AMMSwap – uses a Payment with DeliverMin or Amount + Path (but we treat it separately in UI)
          this.registerRule({
               transactionType: 'AMMSwap',
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
