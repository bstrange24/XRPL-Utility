// src/app/services/validation/validation.service.ts

import { Injectable } from '@angular/core';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import * as xrpl from 'xrpl';
import didSchema from '../../components/did/did-schema.json';

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
}

export type ValidatorFn = (ctx: ValidationContext) => Promise<string | null> | string | null;

export interface TransactionValidationRule {
     transactionType: string;
     validators: ValidatorFn[];
     requiredFields?: string[];
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
     private rules = new Map<string, TransactionValidationRule>();

     constructor(private xrplService: XrplService, private utilsService: UtilsService) {
          this.registerBuiltInRules();
     }

     registerRule(rule: TransactionValidationRule) {
          this.rules.set(rule.transactionType, rule);
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
                    if (!context.inputs[field]) {
                         errors.push(`${this.capitalize(field)} is required`);
                    }
               }
               // if (errors.length > 0) return errors;
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
                    .replace(/([a-z])([A-Z])(?![A-Z])/g, '$1 $2')
                    // Insert space between sequences like "ABCd" → "ABC d"
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                    // Capitalize first character
                    .replace(/^./, m => m.toUpperCase())
          );
     }

     private requireField(field: string, message?: string): ValidatorFn {
          return ctx => (ctx.inputs[field] ? null : message || `${this.capitalize(field)} is required`);
     }

     private isValidAddress(field: string): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               return value && !xrpl.isValidAddress(value) ? `${this.capitalize(field)} is not a valid XRP address` : null;
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

     private numeric(field: string, options: { min?: number; allowEmpty?: boolean; message?: string } = {}): ValidatorFn {
          return ctx => {
               const value = ctx.inputs[field];
               const { min, allowEmpty = false, message } = options;

               if (this.shouldSkipNumericValidation(value) || (allowEmpty && value === '')) {
                    return null;
               }

               const num = parseFloat(value as string);
               if (isNaN(num) || !isFinite(num)) {
                    return message || `${this.capitalize(field)} must be a valid number`;
               }
               if (min !== undefined && num <= min) {
                    return message || `${this.capitalize(field)} must be greater than ${min}`;
               }
               return null;
          };
     }

     private optionalNumeric(field: string, min?: number): ValidatorFn {
          return this.numeric(field, { min, allowEmpty: true });
     }

     private requireDestinationTagIfNeeded(): ValidatorFn {
          return async ctx => {
               const dest = ctx.inputs['destination'];
               if (!dest || !ctx.client) return null;

               try {
                    const info = await this.xrplService.getAccountInfo(ctx.client, dest as string, 'validated', '');
                    if (info.result.account_flags?.requireDestinationTag && !ctx.inputs['destinationTag']) {
                         return 'Destination account requires a destination tag';
                    }
               } catch (err) {
                    console.warn('Could not check destination tag requirement:', err);
                    // Don't block transaction — just warn
               }
               return null;
          };
     }

     private requireDestinationTagIfNeededNewDestination(): ValidatorFn {
          return async ctx => {
               const dest = ctx.inputs['formattedDestination'];
               if (!dest || !ctx.client) return null;

               try {
                    const info = await this.xrplService.getAccountInfo(ctx.client, dest as string, 'validated', '');
                    if (info.result.account_flags?.requireDestinationTag && !ctx.inputs['destinationTag']) {
                         return 'Destination account requires a destination tag';
                    }
               } catch (err) {
                    console.warn('Could not check destination tag requirement:', err);
                    // Don't block transaction — just warn
               }
               return null;
          };
     }

     private shouldSkipNumericValidation = (value: string | undefined): boolean => {
          return value === undefined || value === null || value.trim() === '';
     };

     private invoiceId(): ValidatorFn {
          return ctx => {
               const value = ctx.inputs['invoiceId'];
               if (!value) return null;
               return this.utilsService.validateInput(value) ? null : 'Invoice ID is invalid (contains disallowed characters)';
          };
     }

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
               const num = parseFloat(ctx.inputs['selectedSingleTicket'] as string);
               if (isNaN(num) || num <= 0) {
                    return 'Ticket Sequence must be a valid number greater than 0';
               }
               return null;
          };
     }

     private regularKeySigningValidation(): ValidatorFn[] {
          const whenRegularKey = (ctx: ValidationContext) => !!ctx.inputs['isRegularKeyAddress'] && !ctx.inputs['useMultiSign'];
          return [this.requireIf(whenRegularKey, 'regularKeyAddress', 'Regular Key Address is required'), this.requireIf(whenRegularKey, 'regularKeySeed', 'Regular Key Seed is required'), this.validAddressIf(whenRegularKey, 'regularKeyAddress'), this.validSecretIf(whenRegularKey, 'regularKeySeed')];
     }

     private positiveAmount(): ValidatorFn {
          return ctx => {
               const value = (ctx.inputs['amount'] || '').toString().trim();

               // If field is empty, let requiredFields handle it
               if (value === '') return null;

               const num = Number(value);
               if (isNaN(num)) return 'Amount must be a valid number';
               if (num <= 0) return 'Amount must be greater than 0';
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
               requiredFields: ['seed', 'destination'],
               validators: [
                    this.isValidAddress('destination'),
                    this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeeded(),

                    ctx => {
                         if (!ctx.accountInfo) return 'Account info not loaded';
                         const seq = ctx.accountInfo.result.account_data.Sequence;
                         const ledger = ctx.currentLedger || 0;
                         if (ledger < seq + 256) {
                              const minutes = Math.round(((seq + 256 - ledger) * 4) / 60);
                              return `Account is too new. Must wait ~${minutes} minutes before deletion`;
                         }
                         return null;
                    },

                    ctx => {
                         const objects = ctx.accountObjects?.result?.account_objects;

                         if (objects && objects.length > 0) {
                              // Count each LedgerEntryType
                              const counts: Record<string, number> = {};

                              for (const obj of objects) {
                                   const type = obj.LedgerEntryType || 'Unknown';
                                   counts[type] = (counts[type] || 0) + 1;
                              }

                              // Build readable error message
                              const breakdown = Object.entries(counts)
                                   .map(([type, count]) => `${type}: ${count}`)
                                   .join(', ');

                              return `Cannot delete account — active ledger objects detected (${breakdown})`;
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

          // Payment
          this.registerRule({
               transactionType: 'Payment',
               requiredFields: ['amount', 'destination'],
               validators: [
                    this.positiveAmount(),

                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Destination address valid
                    this.isValidAddress('destination'),
                    this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeededNewDestination(),

                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    this.invoiceId(),
               ],
          });

          // Delegate Actions
          this.registerRule({
               transactionType: 'DelegateActions',
               requiredFields: ['seed', 'destination'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Destination address valid
                    this.isValidAddress('destination'),
                    this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeededNewDestination(),

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
               requiredFields: ['seed', 'subject', 'credentialType'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('subject'),
               ],
          });

          // PermissionedDomainSet Actions
          this.registerRule({
               transactionType: 'PermissionedDomainDelete',
               requiredFields: ['seed', 'domainId'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

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
               requiredFields: ['seed', 'didDocument', 'didUri', 'didData'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // ctx => this.validateDidData(ctx.inputs['didDocument'], 'DID Document')(ctx),
                    // ctx => this.validateDidData(ctx.inputs['didUri'], 'DID URI')(ctx),
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
               requiredFields: ['seed'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

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
               requiredFields: ['seed', 'destination', 'credentialType', 'date'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('subject'),
               ],
          });

          // CredentialDelete Actions
          this.registerRule({
               transactionType: 'CredentialDelete',
               requiredFields: ['seed', 'credentialID'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('subject'),
               ],
          });

          // CredentialAccept Actions
          this.registerRule({
               transactionType: 'CredentialAccept',
               requiredFields: ['seed', 'credentialID'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('subject'),
               ],
          });

          // CredentialVerify Actions
          this.registerRule({
               transactionType: 'CredentialVerify',
               requiredFields: ['seed', 'credentialID'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // Destination address valid
                    this.isValidAddress('subject'),
               ],
          });

          // UpdateAccountFlags Actions
          this.registerRule({
               transactionType: 'UpdateAccountFlags',
               requiredFields: ['seed'], // adjust as needed
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },

                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

                    this.isValidAddress('destination'),
                    this.notSelf('senderAddress', 'destination'),

                    // Master key disabled → must use Regular Key or Multi-Sign
                    this.masterKeyDisabledRequiresAltSigning(),

                    // Ticket validation
                    this.ticketValidation(),

                    // Regular Key signing requirements (only if selected and not multi-signing)
                    ...this.regularKeySigningValidation(),

                    // Multi-Sign validation (addresses + seeds match, valid, etc.)
                    this.multiSign(),

                    // ctx => {
                    //      if (ctx.inputs['flags']) {
                    //           if (ctx.inputs['flags']['noFreeze'] && ctx.inputs['flags']['globalFreeze']) {
                    //                return 'Can not enable both NoFreeze and GlobalFreeze.';
                    //           }
                    //      }
                    //      return null;
                    // },

                    ctx => {
                         if (ctx.inputs['setFlags'].length === 0 && ctx.inputs['clearFlags'].length === 0) {
                              return 'Set Flags and Clear Flags length is 0. No flags selected for update.';
                         }
                         return null;
                    },
               ],
          });

          // TrustSet
          this.registerRule({
               transactionType: 'TrustSet',
               requiredFields: ['currency', 'issuer', 'amount'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },
                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),
                    ctx => (Number(ctx.inputs['amount']) < 0 ? 'Trust amount cannot be negative' : null),

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

          // RemoveTrustline
          this.registerRule({
               transactionType: 'RemoveTrustline',
               requiredFields: ['currency', 'issuer'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },
                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),

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
               requiredFields: ['currency', 'issuer', 'amount'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },
                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),
                    ctx => (Number(ctx.inputs['amount']) < 0 ? 'Trust amount cannot be negative' : null),

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

          // ClawbackTokens
          this.registerRule({
               transactionType: 'ClawbackTokens',
               requiredFields: ['currency', 'issuer', 'limit'],
               validators: [
                    ctx => {
                         if (ctx.inputs['seed']) {
                              const { type, value } = this.utilsService.detectXrpInputType(ctx.inputs['seed']);
                              if (value === 'unknown') return 'Account seed is invalid';
                         }
                         return null;
                    },
                    ctx => (!ctx.accountInfo ? 'Account info not loaded' : null),
                    ctx => (Number(ctx.inputs['limit']) < 0 ? 'Trust limit cannot be negative' : null),

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
     }
}
