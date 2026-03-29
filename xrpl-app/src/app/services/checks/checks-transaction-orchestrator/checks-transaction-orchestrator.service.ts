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
import { CheckUtilService } from '../checks-util/check-util.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CHECK_VALIDATION_RULES } from '../../../components/checks/constants/checks.constants';
import { CheckTxConfig, CheckTxType } from '../../../components/checks/constants/checks.types';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ChecksTransactionBuilderService } from '../checks-transaction-builder/checks-transaction-builder.service';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';

@Injectable({ providedIn: 'root' })
export class CheckTransactionOrchestrator extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     private readonly checkUtilService = inject(CheckUtilService);
     private readonly checksTransactionBuilderService = inject(ChecksTransactionBuilderService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeCredentialTx(type: CheckTxType, config: CheckTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { check, account, txOptions, trustline, currency, preFetchedEnv, wallet } = config;
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
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includePaymentChannelObjects: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const validationRule = CHECK_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, check, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               let tx: any;
               if (type === 'createCheck') {
                    tx = this.checksTransactionBuilderService.buildCreateCheckTx(env.wallet || wallet, env, check, currency);
               } else if (type === 'cashCheck') {
                    tx = this.checksTransactionBuilderService.buildCashCheckTx(env.wallet || wallet, env, check, currency, trustline);
               } else {
                    tx = this.checksTransactionBuilderService.buildCancelCheckTx(env.wallet || wallet, env, check);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.check, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, check, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type, check);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeCredentialTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(type: CheckTxType, wallet: Wallet, env: any, check: any, account: any, txOptions: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
          };

          switch (type) {
               case 'createCheck':
                    return { ...base, createCheck: { amount: check.amount, destination: check.destination } };
               case 'cashCheck':
                    return { ...base, cashCheck: { amount: check.amount, checkIdField: check.checkIdField } };
               case 'cancelCheck':
                    return { ...base, cancelCheck: { checkIdField: check.checkIdField } };
          }
     }

     private async executeSpecificTx(type: CheckTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
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
               case 'createCheck':
                    return this.executor.checkCreate?.(env, tx as xrpl.CheckCreate, wallet, client, opts);
               case 'cashCheck':
                    return this.executor.checkCash?.(env, tx as xrpl.CheckCash, wallet, client, opts);
               case 'cancelCheck':
                    return this.executor.checkCancel?.(env, tx as xrpl.CheckCancel, wallet, client, opts);
          }
     }

     handleSimulationSuccess(type: CheckTxType, check: any, hash?: string) {
          let msg: string;

          if (type === 'createCheck') {
               msg = `Simulated Sending Check of ${check.amountField} ${check.currency || 'XRP'}`;
          } else if (type === 'cashCheck') {
               msg = `Simulated Cashing Check of ${check.amountField} ${check.currencyCode || 'XRP'}`;
          } else {
               msg = `Simulated Cancelling Check ${check.checkIdField}`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     buildSuccessMessage(type: CheckTxType, check: any): string {
          if (type === 'createCheck') {
               return `Successfully Sent Check of ${check.amountField} ${check.currency || 'XRP'} to ${check.destinationAddress?.slice(0, 7) + '…' + check.destinationAddress?.slice(-7)}`;
          }
          if (type === 'cashCheck') {
               return `Successfully Cashed Check of ${check.amountField} ${check.currencyCode || 'XRP'}`;
          }
          return `Successfully Cancelled Check ${check.checkIdField}`;
     }
}
