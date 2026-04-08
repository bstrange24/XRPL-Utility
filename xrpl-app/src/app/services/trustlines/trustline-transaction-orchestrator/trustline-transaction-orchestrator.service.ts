import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TrustlineTransactionBuilderService } from '../trustline-transaction-builder/trustline-transaction-builder.service';
import { CredentialUtilService } from '../../credentials/credential-util/credential-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { TRUSTLINE_TX_TYPES, TRUSTLINE_VALIDATION_RULES, TrustlineTxType } from '../../../components/trustlines/constants/trustline.constants';
import { TrustlineTxConfig } from '../../../components/trustlines/constants/trustline.types';
import { AppConstants } from '../../../core/app.constants';

type TrustlineTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; trustline: any; currency: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: TrustlineTransactionOrchestratorService; env: any; wallet: any; currency: any; config: TrustlineTxConfig }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: TrustlineTransactionOrchestratorService; currency: any }) => string;
     successMessage: (args: { orchestrator: TrustlineTransactionOrchestratorService; currency: any }) => string;
};

const TRUSTLINE_META: Record<TrustlineTxType, TrustlineTxMeta> = {
     setTrustline: {
          validationRule: TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.SET],
          buildValidationInputs: ({ wallet, env, currency, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               setTrustline: {
                    amount: currency.amount,
                    currencyCode: currency.currency,
                    currencyIssuer: currency.issuer,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, currency, config }) => orchestrator.trustlineTransactionBuilderService.buildTrustSetTx(env.wallet || wallet, env, currency, config),
          simulationToastMessage: () => `Successfully simulated setting Trustline.`,
          successMessage: () => `Successfully Set Trustline`,
     },

     removeTrustline: {
          validationRule: TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.REMOVE],
          buildValidationInputs: ({ wallet, env, currency, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               removeTrustline: {
                    amount: currency.amount,
                    currencyCode: currency.currency,
                    currencyIssuer: currency.issuer,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, currency, config }) => orchestrator.trustlineTransactionBuilderService.buildTrustSetRemoveTx(env.wallet || wallet, env, currency, config),
          simulationToastMessage: () => `Successfully simulated removing Trustline.`,
          successMessage: () => `Successfully Removed Trustline`,
     },

     issueCurrency: {
          validationRule: TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.ISSUE],
          buildValidationInputs: ({ wallet, env, currency, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               issueCurrency: {
                    destination: currency.destination,
                    amount: currency.amount,
                    currencyCode: currency.currency,
                    currencyIssuer: currency.issuer,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, currency, config }) => orchestrator.trustlineTransactionBuilderService.buildIssueCurrencyTx(env.wallet || wallet, env, currency, config),
          simulationToastMessage: () => `Successfully issued Currency.`,
          successMessage: () => `Successfully Issued Tokens`,
     },

     clawbackTokens: {
          validationRule: TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.CLAWBACK],
          buildValidationInputs: ({ wallet, env, currency, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               clawbackTokens: {
                    destination: currency.destination,
                    amount: currency.amount,
                    currencyCode: currency.currency,
                    currencyIssuer: currency.issuer,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, currency, config }) => orchestrator.trustlineTransactionBuilderService.buildClawbackTx(env.wallet || wallet, env, currency, config),
          simulationToastMessage: () => `Successfully simulated clawing back Tokens.`,
          successMessage: () => `Successfully Clawed Back Tokens`,
     },

     // addNewIssuers is a UI-only tab — no transaction execution path.
     // Included here to satisfy the Record<TrustlineTxType, ...> exhaustiveness check.
     addNewIssuers: {
          validationRule: TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.ADD],
          buildValidationInputs: ({ wallet, env }) => ({ wallet, network: { accountInfo: env.accountInfo } }),
          buildTx: () => {
               throw new Error('addNewIssuers has no transaction');
          },
          simulationToastMessage: () => '',
          successMessage: () => '',
     },
};

@Injectable({ providedIn: 'root' })
export class TrustlineTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly trustlineTransactionBuilderService = inject(TrustlineTransactionBuilderService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly toastService = inject(ToastService);
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
               const meta = TRUSTLINE_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, trustline, currency, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, currency, config });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.trustline, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance;
               if (currency?.currency === 'XRP') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, currency.amount.toString());
               } else {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkTokenBalance(env);
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
                    return this.handleSimulationSuccess(type, currency, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, currency });
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

     handleSimulationSuccess(type: TrustlineTxType, currency: any, hash?: string) {
          const msg = TRUSTLINE_META[type].simulationToastMessage({ orchestrator: this, currency });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
