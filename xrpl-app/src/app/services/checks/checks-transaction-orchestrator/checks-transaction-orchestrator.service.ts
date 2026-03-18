import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { CheckUtilService } from '../check-util/check-util.service';
import { CheckTxType } from '../../../models/interface-items.model';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

interface CheckTxConfig {
     wallet: Wallet;
     formValues: {
          amountField?: string;
          destinationAddress?: string;
          checkIdField?: string;
          checkCreator?: string;
          currency?: string;
          issuer?: string;
          currencyIssuer?: string;
          isSimulateEnabled?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string | string[];
          suppressIndividualFeedback?: boolean;
          [key: string]: any;
     };
     extra?: {
          expiration?: string; // for create
          enableExpirationDate?: boolean;
          [key: string]: any;
     };
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          checkObjects?: any;
          fee: string;
          currentLedger: number;
          destinationAddress?: any;
          wallet: any;
          // add more fields if needed later
     };
}

@Injectable({ providedIn: 'root' })
export class CheckTransactionOrchestrator extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly checkUtilService = inject(CheckUtilService);
     private readonly optionalFields = inject(TransactionOptionalFieldsService);

     async executeCheckTx(type: CheckTxType, config: CheckTxConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // 1. Use pre-fetched env if available, otherwise fetch
               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Pre-fetched environment missing required fields');
                    }
               } else {
                    // Normal fetch fallback
                    const envFlags: any = {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    };
                    if (type === 'cashCheck' || type === 'cancelCheck') {
                         envFlags.includeChecks = true;
                    }
                    if (formValues.destinationAddress) {
                         envFlags.includeDestinationAccountInfo = true;
                         envFlags.destinationAddress = formValues.destinationAddress;
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment(envFlags);
                    client = env.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               // 2. Validation
               const validationRule = this.getValidationRuleName(type);
               const validationInputs = this.buildValidationInputs(type, wallet, env, formValues, extra);
               const errors = await this.validator.validate(validationRule, {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               // 3. Build transaction
               const tx = this.buildCheckTransaction(type, env.wallet, env, formValues, extra);

               // 4. Apply optional fields
               await this.applyOptionalFields(client, tx, env.wallet, env.accountInfo, type, extra);

               // 5. Execute transaction
               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.checkUtilService.handleSimulationSuccess(type, formValues, txHash);
               }

               // 6. Wait for final outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.checkUtilService.buildSuccessMessage(type, formValues);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, {
                    success: true,
                    hash: txHash,
               });

               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during check transaction';
               console.error(`[${type}] executeCheckTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getValidationRuleName(type: CheckTxType): string {
          const ruleMap: Record<CheckTxType, string> = {
               createCheck: 'CreateCheck',
               cashCheck: 'CashCheck',
               cancelCheck: 'CancelCheck',
          };
          return ruleMap[type];
     }

     private buildValidationInputs(type: CheckTxType, wallet: Wallet, env: any, formValues: any, extra: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'createCheck') {
               return {
                    ...base,
                    createCheck: {
                         amount: formValues.amountField,
                         destination: formValues.destinationAddress,
                    },
               };
          }

          if (type === 'cashCheck') {
               return {
                    ...base,
                    cashCheck: {
                         amount: formValues.amountField,
                         checkIdField: formValues.checkIdField,
                    },
               };
          }

          return {
               ...base,
               cancelCheck: {
                    checkIdField: formValues.checkIdField,
               },
          };
     }

     private buildCheckTransaction(type: CheckTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'createCheck') {
               let sendMax = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyCode, formValues.currencyIssuer ?? '', formValues.amountField, false).sendMax;

               const tx: xrpl.CheckCreate = this.xrplTransactionService.buildCreateCheckTransaction(wallet, sendMax, formValues.destinationAddress, fee, currentLedger);

               if (extra.enableExpirationDate && extra.expiration) {
                    const rippleTime = this.utilsService.toRippleTime(extra.expiration);
                    this.utilsService.setExpiration(tx, Number(rippleTime));
               }

               return tx;
          }

          if (type === 'cashCheck') {
               let amountToCash = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyCode, formValues.currencyIssuer ?? '', formValues.amountField, false).sendMax;
               return this.xrplTransactionService.buildCashCheckTransaction(wallet, amountToCash, formValues.checkIdField, fee, currentLedger);
          }

          // cancel
          return this.xrplTransactionService.buildCheckCancelTransaction(wallet, fee, currentLedger, formValues.checkIdField);
     }

     private async applyOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string, extra: any) {
          if (txType === 'createCheck') {
               this.setCreateTxOptionalFields(checkTx, extra);
          }

          const isTicket = extra.isTicket;
          if (isTicket) {
               // const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(checkTx, ticket, true);
               }
          }

          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(checkTx, memoField);
          }
     }

     private setCreateTxOptionalFields(checkTx: any, extra: any) {
          const expValue = extra.expiration;
          if (expValue && expValue != '' && extra.enableExpirationDate) {
               if (expValue?.trim()) {
                    const checkExpiration = this.utilsService.toRippleTime(expValue);
                    this.utilsService.setExpiration(checkTx, Number(checkExpiration));
               }
          }

          const invoiceIdField = this.txUiService.invoiceIdField();
          if (invoiceIdField) {
               this.utilsService.setInvoiceIdField(checkTx, invoiceIdField);
          }

          const sourceTagField = this.txUiService.sourceTagField();
          if (sourceTagField) {
               this.utilsService.setSourceTagField(checkTx, sourceTagField);
          }

          const destinationTagField = this.txUiService.destinationTagField();
          if (destinationTagField) {
               this.utilsService.setDestinationTag(checkTx, destinationTagField);
          }
     }

     private async executeSpecificTx(type: CheckTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          if (type === 'createCheck') {
               return this.executor.checkCreate(tx as xrpl.CheckCreate, wallet, client, {
                    destination: formValues.destinationAddress,
                    // paymentType: 'issued', // or determine from currency
                    amount: Number(formValues.amountField),
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'cashCheck') {
               return this.executor.checkCash(tx as xrpl.CheckCash, wallet, client, {
                    // paymentType: 'issued', // improve later
                    suppressIndividualFeedback: formValues.suppressIndividualFeedback,
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          return this.executor.checkCancel(tx as xrpl.CheckCancel, wallet, client, {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          });
     }
}
