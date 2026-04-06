import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTransactionOrchestratorService } from '../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';

export interface TxExecutionOptions {
     simulateMessage: string;
     submitMessage: string;
     insufficientXrpMessage?: string;
     amount?: string; // '0' for non-payment txs
}

export interface TxExecutionOptions {
     simulateMessage: string;
     submitMessage: string;
     insufficientXrpMessage?: string;
     amount?: string; // '0' for non-payment txs
}

@Injectable({ providedIn: 'root' })
export class XrplTransactionExecutorService {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly utilsService = inject(UtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplCache = inject(XrplCacheService);
     public readonly xrplService = inject(XrplService);
     public readonly orchestrator = inject(XrplTransactionOrchestratorService);
     constructor() {}

     async executeTx<T extends xrpl.Transaction>(
          env: any,
          client: xrpl.Client,
          wallet: xrpl.Wallet,
          tx: T,
          options: TxExecutionOptions & { isSimulateEnabled?: boolean; useMultiSign?: boolean; multiSignAddress?: string; multiSignSeeds?: string; regularKeyAddress?: string; isRegularKeyAddress?: boolean; regularKeySeed?: string; suppressIndividualFeedback?: boolean; paymentType?: string; amount?: any; destination?: string; submitAndWait?: boolean }
     ): Promise<{ success: true; hash: string } | { success: false; hash: string; error: string }> {
          const { isSimulateEnabled = false, useMultiSign = false, multiSignAddress = '', multiSignSeeds = '', regularKeyAddress = '', isRegularKeyAddress = false, regularKeySeed = '', suppressIndividualFeedback = false, submitAndWait = false } = options;

          if (!isSimulateEnabled) this.txUiService.currentStep.set('preparing');

          this.txUiService.addTxSignal(tx);

          let response: any;

          try {
               if (isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
                    this.txUiService.addTxResultSignal(response.result);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(useMultiSign, regularKeyAddress, isRegularKeyAddress, regularKeySeed);
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, tx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, env.fee, useMultiSign, multiSignAddress, multiSignSeeds);

                    if (!signedTx) {
                         const msg = 'Failed to sign transaction.';
                         this.txUiService.setError(msg);
                         return { success: false, hash: '', error: msg };
                    }

                    if (submitAndWait) {
                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    } else {
                         response = await this.xrplTransactions.submitTransaction1(client, signedTx);
                    }

                    this.txUiService.currentStep.set('waiting_validation');
               }

               console.log('response: ', response);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    return this.handleFailedTx<T>(response);
               }

               // Success for multi-tx: Show multi-tx success message without hash, then add hash signals for each individual tx
               if (suppressIndividualFeedback) {
                    this.txUiService.setSuccessMultiTransactions(this.txUiService.result());
               }
               const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';

               // Success for single tx: Show success message with hash immediately, then add hash signal (which won't trigger a new success message since it's the same tx)
               if (!suppressIndividualFeedback) {
                    this.txUiService.addTxHashSignal(hash);
                    this.txUiService.setSuccess(this.txUiService.result()); // ← Only for single tx
               }

               return { success: true, hash };
          } catch (err: any) {
               const msg = err.message || 'Unknown error during transaction';
               this.txUiService.setError(msg);
               return { success: false, hash: '', error: msg };
          } finally {
               // Only hide spinner if not suppressed (let parent control it)
               if (!suppressIndividualFeedback) {
                    this.txUiService.spinner.set(false);
               }
          }
     }

     private handleFailedTx<T extends xrpl.Transaction>(response: any) {
          const resultMsg = this.utilsService.getTransactionResultMessage(response);
          const userMessage = '\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
          const hash = response.result.tx_json.hash ?? response.result.tx_json.hash ?? 'unknown';

          console.error(`Transaction failed: ${resultMsg}`, response);

          // Shows the message
          if (response.result) response.result.errorMessage = userMessage;

          // Update the signal so preview updates immediately
          this.txUiService.addTxResultSignal(response.result);

          // Show error panel/toast
          this.txUiService.setError(userMessage);

          return { success: false, error: userMessage, hash: hash };
     }
}
