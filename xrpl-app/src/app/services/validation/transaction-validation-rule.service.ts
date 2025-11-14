// src/app/services/validation/validation.service.ts

import { Injectable } from '@angular/core';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import * as xrpl from 'xrpl';

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
               if (errors.length > 0) return errors;
          }

          // Run all validators
          const results = await Promise.all(rule.validators.map(validator => Promise.resolve(validator(context))));

          results.forEach(err => err && errors.push(err));
          return errors.filter(Boolean);
     }

     private capitalize(str: string): string {
          return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1');
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

     private registerBuiltInRules() {
          // AccountInfo
          this.registerRule({
               transactionType: 'AccountInfo',
               requiredFields: ['seed', 'accountInfo'],
               validators: [
                    this.requireField('seed', 'Wallet seed is required'),

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
                    this.requireField('seed'),
                    this.requireField('destination'),
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

                    ctx => {
                         const disabledMaster = ctx.accountInfo?.result?.account_flags?.disableMasterKey;
                         const usingRegularKey = !!ctx.inputs['isRegularKeyAddress'];
                         const usingMultiSign = !!ctx.inputs['useMultiSign'];

                         if (disabledMaster && !usingRegularKey && !usingMultiSign) {
                              return 'Master key is disabled — must sign with Regular Key or Multi-Sign';
                         }
                         return null;
                    },
               ],
          });

          // Payment
          this.registerRule({
               transactionType: 'Payment',
               requiredFields: ['amount', 'destination'],
               validators: [
                    this.requireField('amount'),
                    this.requireField('destination'),
                    this.isValidAddress('destination'),
                    this.notSelf('senderAddress', 'destination'),
                    this.requireDestinationTagIfNeeded(),
                    this.optionalNumeric('destinationTag', 0),
                    this.optionalNumeric('sourceTag', 0),
                    this.invoiceId(),
                    this.requireDestinationTagIfNeeded(),
                    this.multiSign(),
                    ctx => {
                         const amount = Number(ctx.inputs['amount']);
                         return isNaN(amount) || amount <= 0 ? 'Amount must be a positive number' : null;
                    },
               ],
          });

          // TrustSet
          this.registerRule({
               transactionType: 'TrustSet',
               requiredFields: ['currency', 'issuer', 'limit'],
               validators: [this.requireField('currency'), this.requireField('issuer'), this.requireField('limit'), this.isValidAddress('issuer'), ctx => (Number(ctx.inputs['limit']) < 0 ? 'Trust limit cannot be negative' : null)],
          });
     }
}
