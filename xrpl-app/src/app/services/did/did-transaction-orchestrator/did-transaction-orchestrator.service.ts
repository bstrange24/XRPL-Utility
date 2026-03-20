import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { DidUtilService } from '../did-util/did-util.service';
import { DidStoreService } from '../did-store/did-store.service';
import { DID_VALIDATION_RULES } from '../../../components/did/constants/did.constants';
import { DidTxConfig, DidTxType } from '../../../components/did/constants/did.types';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { DidTransactionBuilderService } from '../did-transaction-builder/did-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class DidTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didStoreService = inject(DidStoreService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly didTransactionBuilderService = inject(DidTransactionBuilderService);

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

               // Validation
               const validationRule = DID_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, did, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               let tx: any;
               if (type === 'setDid') {
                    tx = this.didTransactionBuilderService.buildDidSetTransaction(env.wallet || wallet, env, did);
               } else {
                    tx = this.didTransactionBuilderService.buildDidDeleteTransaction(env.wallet || wallet, env);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.did, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
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
               console.error(`[${type}] executeDidTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(type: DidTxType, wallet: Wallet, env: any, did: any, account: any, txOptions: any) {
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
               case 'setDid':
                    return { ...base, did: { didDocument: did.didDocumentData, didUri: did.uriData, didData: did.didData } };
               case 'deleteDid':
                    return { ...base };
          }
     }

     private async executeSpecificTx(type: DidTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
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
               case 'setDid':
                    return this.executor.setDid?.(env, tx as xrpl.DIDSet, wallet, client, opts);
               case 'deleteDid':
                    return this.executor.deleteDid?.(env, tx as xrpl.DIDDelete, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: DidTxType): string {
          if (type === 'setDid') return `Successfully Set DID`;

          return `Successfully Deleted DID`;
     }

     handleSimulationSuccess(type: DidTxType, hash?: string) {
          let msg: string;

          if (type === 'setDid') msg = `Successfully simulated setting the DID`;
          else msg = `Successfully simulated deleting the DID`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
