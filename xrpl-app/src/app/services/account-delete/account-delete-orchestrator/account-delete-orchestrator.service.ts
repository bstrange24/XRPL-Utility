import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { ToastService } from '../../toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { AccountDeleteTransactionBuilderService } from '../account-delete-transaction-builder/account-delete-transaction-builder.service';
import { AccountDeleteUtilService } from '../account-delete-util/account-delete-util.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';
import { AccountDeleteConfig, AccountDeleteTxType } from '../../../components/account-delete/constants/account-delete.types';
import { ACCOUNT_DELETE_TX_TYPES } from '../../../components/account-delete/constants/account-delete.constants';
import { AppConstants } from '../../../core/app.constants';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

type AccountDeleteTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; accountDelete: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: AccountDeleteOrchestratorService; env: any; wallet: any; accountDelete: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: AccountDeleteOrchestratorService; env: any }) => string;
     successMessage: (args: { orchestrator: AccountDeleteOrchestratorService; env: any }) => string;
};

const ACCOUNT_DELETE_META: Record<AccountDeleteTxType, AccountDeleteTxMeta> = {
     deleteAccount: {
          // ACCOUNT_DELETE_TX_TYPES is the validation rule string itself (not a key into a map)
          validationRule: ACCOUNT_DELETE_TX_TYPES,
          buildValidationInputs: ({ wallet, env, accountDelete, account, txOptions }) => ({
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
               destination: { destination: accountDelete.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, accountDelete }) => orchestrator.accountDeleteTransactionBuilderService.buildAccountDeleteTx(env.wallet || wallet, env, accountDelete, env.accountInfo),
          simulationToastMessage: () => `Successfully simulated Deleting Account`,
          successMessage: ({ env }) => `Successfully Deleted Account ${env.wallet.classicAddress}`,
     },
};

@Injectable({ providedIn: 'root' })
export class AccountDeleteOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly accountDeleteTransactionBuilderService = inject(AccountDeleteTransactionBuilderService);
     public readonly deleteAccountUtilService = inject(AccountDeleteUtilService);
     public readonly deleteAccountStoreService = inject(AccountDeleteStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly toastService = inject(ToastService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);

     async executeDeleteAccountTx(type: AccountDeleteTxType, config: AccountDeleteConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { accountDelete, account, txOptions, preFetchedEnv, wallet } = config;
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
                         includeBlockingObjects: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = ACCOUNT_DELETE_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, accountDelete, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, accountDelete });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.accountDelete, type, txOptions);

               // Submit / simulate
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
                    return this.handleSimulationSuccess(env, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, env });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeDeleteAccountTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(env: any, hash?: string) {
          const msg = ACCOUNT_DELETE_META['deleteAccount'].simulationToastMessage({ orchestrator: this, env });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
