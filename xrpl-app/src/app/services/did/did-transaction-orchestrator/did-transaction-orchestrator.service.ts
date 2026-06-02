import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { DidTransactionBuilderService } from '../did-transaction-builder/did-transaction-builder.service';
import { DidUtilService } from '../did-util/did-util.service';
import { DidStoreService } from '../did-store/did-store.service';
import { DidTxConfig, DidTxType } from '../../../components/did/constants/did.types';
import { AppConstants } from '../../../core/app.constants';

type DidTxMeta = {
     buildTx: (args: { orchestrator: DidTransactionOrchestratorService; env: any; wallet: any; did: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: DidTransactionOrchestratorService; did: any }) => string;
     successMessage: (args: { orchestrator: DidTransactionOrchestratorService; did: any }) => string;
};

const DID_META: Record<DidTxType, DidTxMeta> = {
     setDid: {
          buildTx: ({ orchestrator, env, wallet, did }) => orchestrator.didTransactionBuilderService.buildDidSetTransaction(env.wallet || wallet, env, did),
          simulationToastMessage: () => `Simulated Setting DID`,
          successMessage: () => `Successfully Set DID`,
     },

     deleteDid: {
          buildTx: ({ orchestrator, env, wallet }) => orchestrator.didTransactionBuilderService.buildDidDeleteTransaction(env.wallet || wallet, env),
          simulationToastMessage: () => `Simulated Deleting DID`,
          successMessage: () => `Successfully Deleted DID`,
     },
};

@Injectable({ providedIn: 'root' })
export class DidTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly didTransactionBuilderService = inject(DidTransactionBuilderService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didStoreService = inject(DidStoreService);
     public readonly toastService = inject(ToastService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeDidTx(type: DidTxType, config: DidTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { did, account, txOptions, preFetchedEnv, wallet } = config;
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
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Build transaction
               const meta = DID_META[type];
               const tx = meta.buildTx({ orchestrator: this, env, wallet, did });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.did, type, txOptions);

               // Balance check
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
                    return this.handleSimulationSuccess(type, did, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, did });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeDidTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: DidTxType, did: any, hash?: string) {
          const msg = DID_META[type].simulationToastMessage({ orchestrator: this, did });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
