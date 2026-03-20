import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { AccountDeleteConfig, AccountDeleteTxType } from '../../../components/account-delete/constants/account-delete.types';
import { ACCOUNT_DELETE_TX_TYPES } from '../../../components/account-delete/constants/account-delete.constants';
import { AccountDeleteUtilService } from '../account-delete-util/account-delete-util.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { AccountDeleteTransactionBuilderService } from '../account-delete-transaction-builder/account-delete-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class AccountDeleteOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly deleteAccountUtilService = inject(AccountDeleteUtilService);
     public readonly deleteAccountStoreService = inject(AccountDeleteStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly toastService = inject(ToastService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly accountDeleteTransactionBuilderService = inject(AccountDeleteTransactionBuilderService);

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
               const validationInputs = this.buildValidationInputs(wallet, env, accountDelete, account, txOptions);
               const errors = await this.validator.validate(ACCOUNT_DELETE_TX_TYPES, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = this.accountDeleteTransactionBuilderService.buildAccountDeleteTx(env.wallet || wallet, env, accountDelete, env.accountInfo);

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.accountDelete, type, txOptions);

               // Execute
               const execResult = await this.executeSpecificTx(tx, env, env.wallet || wallet, client, account, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(preFetchedEnv);
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

     private buildValidationInputs(wallet: Wallet, env: any, accountDelete: any, account: any, txOptions: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
          };

          return { ...base, destination: { destination: accountDelete.destination } };
     }

     private async executeSpecificTx(tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
          const opts = {
               useMultiSign: txOptions.useMultiSign,
               isRegularKeyAddress: txOptions.isRegularKeyAddress,
               isSimulateEnabled: txOptions.isSimulateEnabled,
               regularKeyAddress: account.regularKeyAddress,
               regularKeySeed: account.regularKeySeed,
               multiSignAddress: account.multiSignAddress,
               multiSignSeeds: account.multiSignSeeds,
          };

          return this.executor.accountDelete?.(env, tx as xrpl.AccountDelete, wallet, client, opts);
     }

     buildSuccessMessage(preFetchedEnv: any): string {
          return `Successfully Deleted Account ${preFetchedEnv.wallet.classicAddress}`;
     }

     handleSimulationSuccess(hash?: any) {
          let msg = `Successfully simulated Deleting Account`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
