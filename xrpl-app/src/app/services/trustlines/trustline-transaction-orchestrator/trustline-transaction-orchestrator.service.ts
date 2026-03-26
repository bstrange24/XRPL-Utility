import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CredentialTransactionBuilderService } from '../../credentials/credential-transaction-builder/credential-transaction-builder.service';
import { CredentialUtilService } from '../../credentials/credential-util/credential-util.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TRUSTLINE_VALIDATION_RULES, TrustlineTxType } from '../../../components/trustlines/constants/trustline.constants';
import { TrustlineState, TrustlineTxConfig } from '../../../components/trustlines/constants/trustline.types';
import { AppConstants } from '../../../core/app.constants';
import { TrustlineTransactionBuilderService } from '../trustline-transaction-builder/trustline-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class TrustlineTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly trustlineTransactionBuilderService = inject(TrustlineTransactionBuilderService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeTrustlineTx(type: TrustlineTxType, config: TrustlineTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { trustline, currency, account, txOptions, preFetchedEnv, wallet } = config;
          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const validationRule = TRUSTLINE_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, trustline, currency, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               let tx: any;
               if (type === 'setTrustline') {
                    tx = this.trustlineTransactionBuilderService.buildTrustSetTx(env.wallet || wallet, env, currency, config);
               } else if (type === 'removeTrustline') {
                    tx = this.trustlineTransactionBuilderService.buildTrustSetRemoveTx(env.wallet || wallet, env, currency, config);
               } else if (type === 'issueCurrency') {
                    tx = this.trustlineTransactionBuilderService.buildIssueCurrencyTx(env.wallet || wallet, env, currency, config);
               } else {
                    tx = this.trustlineTransactionBuilderService.buildClawbackTx(env.wallet || wallet, env, currency, config);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.trustline, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
               // if (1 === 1) {
               // throw new Error('Stanky Poop');
               // }
               const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, account, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeTrustlineTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(type: TrustlineTxType, wallet: Wallet, env: any, trustline: any, currency: any, account: any, txOptions: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
          };

          switch (type) {
               case 'setTrustline':
                    return { ...base, setTrustline: { amount: currency.amount, currencyCode: currency.currency, currencyIssuer: currency.issuer } };
               case 'removeTrustline':
                    return { ...base, removeTrustline: { amount: currency.amount, currencyCode: currency.currency, currencyIssuer: currency.issuer } };
               case 'issueCurrency':
                    return { ...base, issueCurrency: { destination: currency.destination, amount: currency.amount, currencyCode: currency.currency, currencyIssuer: currency.issuer } };
               case 'clawbackTokens':
                    return { ...base, clawbackTokens: { destination: currency.destination, amount: currency.amount, currencyCode: currency.currency, currencyIssuer: currency.issuer } };
               default:
                    throw new Error('Unknown transaction type');
          }
     }

     private async executeSpecificTx(type: TrustlineTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
          const opts = {
               useMultiSign: txOptions.useMultiSign,
               isRegularKeyAddress: txOptions.isRegularKeyAddress,
               isSimulateEnabled: txOptions.isSimulateEnabled,
               regularKeyAddress: account.regularKeyAddress,
               regularKeySeed: account.regularKeySeed,
               multiSignAddress: account.multiSignAddress,
               multiSignSeeds: account.multiSignSeeds,
          };

          switch (type) {
               case 'setTrustline':
                    return this.executor.setTrustline?.(env, tx as xrpl.TrustSet, wallet, client, opts);
               case 'removeTrustline':
                    return this.executor.removeTrustline?.(env, tx as xrpl.TrustSet, wallet, client, opts);
               case 'issueCurrency':
                    return this.executor.issueCurrency?.(env, tx as xrpl.Payment, wallet, client, opts);
               case 'clawbackTokens':
                    return this.executor.clawbackTokens?.(env, tx as xrpl.Clawback, wallet, client, opts);
               default:
                    throw new Error('Unknown transaction type');
          }
     }

     buildSuccessMessage(type: TrustlineTxType): string {
          switch (type) {
               case 'setTrustline':
                    return `Successfully Set Trustline`;
               case 'removeTrustline':
                    return `Successfully Removed Trustline`;
               case 'issueCurrency':
                    return `Successfully Issued Tokens`;
               case 'clawbackTokens':
                    return `Successfully Clawed Back Tokens`;
               default:
                    throw new Error('Unknown transaction type');
          }
     }

     handleSimulationSuccess(type: TrustlineTxType, hash?: string) {
          let msg: string;

          if (type === 'setTrustline') msg = `Successfully simulated setting Trustline.`;
          else if (type === 'removeTrustline') msg = `Successfully simulated removing Trustline.`;
          else if (type === 'issueCurrency') msg = `Successfully issued Currency.`;
          else if (type === 'clawbackTokens') msg = `Successfully simulated clawing back Tokens.`;
          else msg = `Unkown transaction type.`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
