import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../toast/toast.service';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/base/performance-base/performance-base.component';

type TrustLineTxType = 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens';

interface TrustLineTxConfig {
     wallet: Wallet;
     formValues: {
          amountField?: string;
          destinationAddress?: string;
          currency?: string;
          issuer?: string;
          submitAndWait?: boolean;
          currencyIssuer?: string;
          isSimulateEnabled?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          trustlineFlags?: any;
          suppressIndividualFeedback?: boolean;
          multiSignSeeds?: string | string[];
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

@Injectable({
     providedIn: 'root',
})
export class TrustlineOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly optionalFields = inject(TransactionOptionalFieldsService);

     async executeTrustlineTx(type: TrustLineTxType, config: TrustLineTxConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // 1. Use pre-fetched env if available, otherwise fetch ──
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
                    if (type === 'setTrustline' || type === 'removeTrustline' || type === 'issueCurrency' || type === 'clawbackTokens') {
                         envFlags.includeTrustlines = true;
                    }
                    if (formValues.destinationAddress) {
                         envFlags.includeDestinationAccountInfo = true;
                         envFlags.destinationAddress = formValues.destinationAddress;
                    }
                    const env = await this.TxEnvironmentService.prepareTxEnvironment(envFlags);
                    client = env.client;
                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               // 2. Validation
               const validationInputs = this.buildValidationInputs(type, wallet, env, formValues, extra);
               const errors = await this.validator.validate(this.getValidationRuleName(type), {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               // 3. Build transaction
               const tx = this.buildTrustlineTransaction(type, env.wallet, env, formValues, extra);

               // 4. Apply optional fields
               await this.applyOptionalFields(client, tx, env.wallet, env.accountInfo, type, extra);

               // 5. Execute transaction
               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.handleSimulationSuccess(type, formValues, txHash);
               }

               // 6. Wait for final outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);
               this.xrplTransactionService.processTxFinalResult(finalResult, this.buildSuccessMessage(type, formValues), {
                    success: true,
                    hash: txHash,
               });

               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during trustline transaction';
               console.error(`[${type}] executeTrustlineTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
               // Note: Do **not** refresh here — let the component decide when/how
          }
     }

     private getValidationRuleName(type: TrustLineTxType): string {
          const ruleMap: Record<TrustLineTxType, string> = {
               setTrustline: 'TrustSet',
               removeTrustline: 'RemoveTrustline',
               issueCurrency: 'IssueCurrency',
               clawbackTokens: 'ClawbackTokens',
          };

          return ruleMap[type];
     }

     private buildValidationInputs(type: TrustLineTxType, wallet: Wallet, env: any, formValues: any, extra: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'setTrustline') {
               return {
                    ...base,
                    setTrustline: {
                         trustlineLimitField: formValues.trustlineLimitField,
                         currencyCode: formValues.currencyCode,
                         currencyIssuer: formValues.currencyIssuer,
                    },
               };
          }

          if (type === 'removeTrustline') {
               return {
                    ...base,
                    removeTrustline: {
                         trustlineLimitField: formValues.trustlineLimitField,
                         currencyCode: formValues.currencyCode,
                         currencyIssuer: formValues.currencyIssuer,
                    },
               };
          }

          if (type === 'issueCurrency') {
               return {
                    ...base,
                    issueCurrency: {
                         trustlineLimitField: formValues.trustlineLimitField,
                         currencyCode: formValues.currencyCode,
                         currencyIssuer: formValues.currencyIssuer,
                         destination: formValues.destinationAddress,
                    },
               };
          }

          // clawbackTokens
          return {
               ...base,
               clawbackTokens: {
                    trustlineLimitField: formValues.trustlineLimitField,
                    currencyCode: formValues.currencyCode,
                    currencyIssuer: formValues.currencyIssuer,
                    destination: formValues.destinationAddress,
               },
          };
     }

     private buildTrustlineTransaction(type: TrustLineTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'setTrustline') {
               let limitAmount = this.xrplTransactionService.buildAmount(formValues.currencyCode, formValues.trustlineLimitField, formValues.currencyIssuer ?? '');
               const tx: xrpl.TrustSet = this.xrplTransactionService.buildTrustlineSetTransaction(wallet, limitAmount.amountToCash, fee, currentLedger);

               if (formValues.trustlineFlags) {
                    tx.Flags = formValues.trustlineFlags;
               }

               return tx;
          }

          if (type === 'removeTrustline') {
               let limitAmount = this.xrplTransactionService.buildAmount(formValues.currencyCode, '0', formValues.currencyIssuer ?? '');
               const tx: xrpl.TrustSet = this.xrplTransactionService.buildTrustlineSetTransaction(wallet, limitAmount.amountToCash, fee, currentLedger);

               if (formValues.trustlineFlags) {
                    tx.Flags = formValues.trustlineFlags;
               }

               return tx;
          }

          if (type === 'issueCurrency') {
               let sendMax = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyCode, formValues.currencyIssuer ?? '', formValues.trustlineLimitField.toString(), false).sendMax;
               return this.xrplTransactionService.buildIssueCurrencyTransaction(wallet, sendMax, formValues.destinationAddress, fee, currentLedger);
          }

          // clawbackTokens
          let sendMax = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyCode, formValues.destinationAddress ?? '', formValues.trustlineLimitField.toString(), false).sendMax;
          return this.xrplTransactionService.buildClawbackTransaction(wallet, sendMax, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, trustlineTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string, extra: any) {
          if (txType === 'create' || txType === 'issuedCurrency') {
               this.setCreateTxOptionalFields(trustlineTx, extra);
          }

          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(trustlineTx, ticket, true);
               }
          }

          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(trustlineTx, memoField);
          }
     }

     private setCreateTxOptionalFields(trustlineTx: any, extra: any) {
          const invoiceIdField = this.txUiService.invoiceIdField();
          if (invoiceIdField) {
               this.utilsService.setInvoiceIdField(trustlineTx, invoiceIdField);
          }

          const sourceTagField = this.txUiService.sourceTagField();
          if (sourceTagField) {
               this.utilsService.setSourceTagField(trustlineTx, sourceTagField);
          }

          const destinationTagField = this.txUiService.destinationTagField();
          if (destinationTagField) {
               this.utilsService.setDestinationTag(trustlineTx, destinationTagField);
          }
     }

     private async executeSpecificTx(type: TrustLineTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          if (type === 'setTrustline') {
               return this.executor.setTrustline(tx as xrpl.TrustSet, wallet, client, {
                    // destination: formValues.destinationAddress,
                    paymentType: 'issued',
                    suppressIndividualFeedback: formValues.suppressIndividualFeedback,
                    customSpinnerMessage: `Settimg trustline...`,
                    submitAndWait: formValues.submitAndWait,
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'removeTrustline') {
               return this.executor.setTrustline(tx as xrpl.TrustSet, wallet, client, {
                    paymentType: 'issued', // improve later
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'issueCurrency') {
               return this.executor.issueCurrency(tx as xrpl.Payment, wallet, client, {
                    paymentType: 'issued', // improve later
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          // clawbackTokens
          return this.executor.clawbackTokens(tx as xrpl.Clawback, wallet, client, {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          });
     }

     private handleSimulationSuccess(type: TrustLineTxType, formValues: any, hash?: string) {
          let msg: string;

          if (type === 'setTrustline') {
               msg = `Simulated Trustline Set`;
          } else if (type === 'removeTrustline') {
               msg = `Simulated Trustline Removal`;
          } else if (type === 'issueCurrency') {
               msg = `Simulated Issuing Currency`;
          } else {
               msg = `Simulated Trustline Clawback`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toast.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     private buildSuccessMessage(type: TrustLineTxType, formValues: any): string {
          if (type === 'setTrustline') {
               return `Successfully Set Trustline`;
          } else if (type === 'removeTrustline') {
               return `Successfully Removed Trustline`;
          } else if (type === 'issueCurrency') {
               return `Successfully Issued Currency`;
          }
          return `Successfully Clawed back Tokens`;
     }
}
