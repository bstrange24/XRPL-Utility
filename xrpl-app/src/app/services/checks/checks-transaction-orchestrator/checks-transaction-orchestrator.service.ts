import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CHECK_TX_TYPES, CHECK_VALIDATION_RULES } from '../../../components/checks/constants/checks.constants';
import { CheckTxConfig, CheckTxType } from '../../../components/checks/constants/checks.types';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ChecksTransactionBuilderService } from '../checks-transaction-builder/checks-transaction-builder.service';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';

type CheckMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; check: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: CheckTransactionOrchestrator; env: any; wallet: any; check: any; currency: any; trustline: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: CheckTransactionOrchestrator; check: any; currency: any }) => string;
     successMessage: (args: { orchestrator: CheckTransactionOrchestrator; check: any; currency: any }) => string;
};

const CHECK_META: Record<CheckTxType, CheckMeta> = {
     createCheck: {
          validationRule: CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, check, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               createCheck: { amount: check.amount, destination: check.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, check, currency }) => orchestrator.checksTransactionBuilderService.buildCreateCheckTx(env.wallet || wallet, env, check, currency),
          simulationToastMessage: ({ orchestrator, check, currency }) => `Simulated Sending Check of ${check.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, check, currency }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = check.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               return `Successfully Sent Check of ${check.amount} ${code}${shortDest ? ` to ${shortDest}` : ''}`;
          },
     },

     cashCheck: {
          validationRule: CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CASH],
          buildValidationInputs: ({ wallet, env, check, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               cashCheck: { amount: check.amount, checkIdField: check.checkIdField },
          }),
          buildTx: ({ orchestrator, env, wallet, check, currency, trustline }) => orchestrator.checksTransactionBuilderService.buildCashCheckTx(env.wallet || wallet, env, check, currency, trustline),
          simulationToastMessage: ({ orchestrator, check, currency }) => `Simulated Cashing Check of ${check.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, check, currency }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               return `Successfully Cashed Check of ${check.amount} ${code}`;
          },
     },

     cancelCheck: {
          validationRule: CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CANCEL],
          buildValidationInputs: ({ wallet, env, check, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               cancelCheck: { checkIdField: check.checkIdField },
          }),
          buildTx: ({ orchestrator, env, wallet, check }) => orchestrator.checksTransactionBuilderService.buildCancelCheckTx(env.wallet || wallet, env, check),
          simulationToastMessage: ({ check }) => `Simulated Cancelling Check ${check.checkIdField}`,
          successMessage: ({ check }) => `Successfully Cancelled Check ${check.checkIdField}`,
     },
};

@Injectable({ providedIn: 'root' })
export class CheckTransactionOrchestrator extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     public readonly checksTransactionBuilderService = inject(ChecksTransactionBuilderService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);

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
                         includeChecks: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = CHECK_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, check, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, check, currency, trustline });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.check, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance;
               if (currency?.currency !== 'XRP') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkTokenBalance(env);
               } else {
                    if (type !== 'createCheck') {
                         isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
                    } else {
                         isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, check.amount);
                    }
               }
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               //  Submit / simulate
               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,

                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                    skipBalanceCheck: true,

                    ui: {
                         suppressIndividualFeedback: false,
                    },

                    signing: {
                         useMultiSign: txOptions?.useMultiSign,
                         multiSignAddress: account?.multiSignAddress,
                         multiSignSeeds: account?.multiSignSeeds,
                         isRegularKeyAddress: txOptions?.isRegularKeyAddress,
                         regularKeySeed: account?.regularKeySeed,
                         regularKeyAddress: account?.regularKeyAddress,
                    },

                    buildTx: () => tx as any,
               });

               if (!submitOrSimResult.success) return { success: false, error: submitOrSimResult.error };

               txHash = submitOrSimResult.hash;

               // Simulated toast
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, check, currency, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, check, currency });
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

     handleSimulationSuccess(type: CheckTxType, check: any, currency: any, hash?: string) {
          const msg = CHECK_META[type].simulationToastMessage({ orchestrator: this, check, currency });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
