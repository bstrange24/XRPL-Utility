import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { DelegateTxConfig, DelegateTxType } from '../../../components/delegate/constants/delegate.types';
import { DELEGATE_TX_TYPES, DELEGATE_VALIDATION_RULES } from '../../../components/delegate/constants/delegate.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { DelegateTransactionBuilderService } from '../delegate-transaction-builder/delegate-transaction-builder.service';
import { AppConstants } from '../../../core/app.constants';

type DelegateMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; delegate: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: DelegateTransactionOrchestratorService; env: any; wallet: any; delegate: any; account: any; txOptions: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: DelegateTransactionOrchestratorService; delegate: any }) => string;
     successMessage: (args: { orchestrator: DelegateTransactionOrchestratorService; delegate: any }) => string;
};

const DELEGATE_META: Record<DelegateTxType, DelegateMeta> = {
     delegateCreate: {
          validationRule: DELEGATE_VALIDATION_RULES[DELEGATE_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, delegate, account, txOptions }) => ({
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
               delegateCreate: { amount: txOptions.ticketCountField },
          }),
          buildTx: ({ orchestrator, env, wallet, delegate, account, txOptions }) => orchestrator.delegateTransactionBuilderService.buildDelegateTx(env.wallet || wallet, env, delegate, account, txOptions),
          simulationToastMessage: ({ orchestrator, delegate }) => `Simulated Setting Delegation`,
          successMessage: ({ orchestrator, delegate }) => {
               return `Successfully Set Delegation`;
          },
     },
     delegateClear: {
          validationRule: DELEGATE_VALIDATION_RULES[DELEGATE_TX_TYPES.CLEAR],
          buildValidationInputs: ({ wallet, env, delegate, account, txOptions }) => ({
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
               delegateClear: { ticketId: delegate.ticketId },
          }),
          buildTx: ({ orchestrator, env, wallet, delegate, account, txOptions }) => orchestrator.delegateTransactionBuilderService.buildDelegateTx(env.wallet || wallet, env, delegate, account, txOptions),
          simulationToastMessage: ({ delegate }) => `Simulated Clearing Delegation`,
          successMessage: ({ delegate }) => `Successfully Cleared Delegation`,
     },
};

@Injectable({ providedIn: 'root' })
export class DelegateTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly delegateTransactionBuilderService = inject(DelegateTransactionBuilderService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);

     async executeDelegateTx(type: DelegateTxType, config: DelegateTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any; deletedHashes?: { ticketSeq: string; hash: string }[] }> {
          const { delegate, account, txOptions, preFetchedEnv, wallet } = config;
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
                         includeTickets: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = DELEGATE_META[type];
               const validationInputs = meta.buildValidationInputs({ wallet, env, delegate, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, delegate, account, txOptions });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.delegate, type, txOptions);

               // Balance checks (token vs xrp)
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
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
                    return this.handleSimulationSuccess(type, delegate, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, delegate });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeTicketTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: DelegateTxType, delegate: any, currency: any, hash?: string) {
          const msg = DELEGATE_META[type].simulationToastMessage({ orchestrator: this, delegate });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
