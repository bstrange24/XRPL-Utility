// xrpl-transaction-executor.service.ts
import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { CredentialAccept, CredentialCreate, CredentialDelete } from 'xrpl';

export interface TxExecutionOptions {
     simulateMessage: string;
     submitMessage: string;
     insufficientXrpMessage?: string;
     amount?: string; // '0' for non-payment txs
}

@Injectable({ providedIn: 'root' })
export class XrplTransactionExecutorService {
     constructor(private xrplTransactions: XrplTransactionService, private utilsService: UtilsService, private txUiService: TransactionUiService, private xrplCache: XrplCacheService, private xrplService: XrplService) {}

     async execute<T extends xrpl.Transaction>(client: xrpl.Client, wallet: xrpl.Wallet, tx: T, options: TxExecutionOptions & { useMultiSign?: boolean; multiSignAddress?: string; multiSignSeeds?: string; isRegularKeyAddress?: boolean; regularKeySeed?: string }): Promise<{ success: true; hash: string } | { success: false; error: string }> {
          const { simulateMessage, submitMessage, insufficientXrpMessage = 'Insufficient XRP to complete transaction', amount = '0', useMultiSign = false, multiSignAddress = '', multiSignSeeds = '', isRegularKeyAddress = false, regularKeySeed = '' } = options;

          // 1. Get fresh data in parallel
          const [{ accountInfo, accountObjects }, { fee, serverInfo }] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false })]);

          // 2. Balance check
          if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, amount, wallet.classicAddress, tx, fee)) {
               return { success: false, error: insufficientXrpMessage };
          }

          // 3. Show spinner
          this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled ? simulateMessage : submitMessage, 200);

          // 4. Set preview
          this.txUiService.setTxSignal(tx);

          let response: any;

          try {
               if (this.txUiService.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(useMultiSign, isRegularKeyAddress, regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, tx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, useMultiSign, multiSignAddress, multiSignSeeds);

                    if (!signedTx) {
                         return { success: false, error: 'Failed to sign transaction.' };
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // 5. Handle result
               this.txUiService.setTxResultSignal(response.result);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               // Inside XrplTransactionExecutorService.execute()

               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);

                    // CRITICAL: Keep this so your <app-transaction-preview> shows the nice message
                    if (response.result) {
                         (response.result as any).errorMessage = userMessage;
                    }

                    // Update the signal so preview updates immediately
                    this.txUiService.setTxResultSignal(response.result);

                    // Show error panel/toast
                    this.txUiService.setError(userMessage);

                    return { success: false, error: userMessage };
               }

               // Success!
               this.txUiService.setSuccess(this.txUiService.result);
               const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';
               this.txUiService.txHash = hash;

               return { success: true, hash };
          } catch (err: any) {
               const msg = err.message || 'Unknown error during transaction';
               this.txUiService.setError(msg);
               return { success: false, error: msg };
          } finally {
               this.txUiService.spinner = false;
          }
     }

     async createCredential(
          tx: xrpl.CredentialCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Create Credentials (no changes will be made)...',
               submitMessage: 'Submitting Create Credentials to Ledger...',
               amount: '0',
               ...options,
          });
     }

     async deleteCredential(
          tx: xrpl.CredentialDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Delete Credentials (no changes will be made)...',
               submitMessage: 'Deleting Credential from Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async acceptCredential(
          tx: xrpl.CredentialAccept,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Credentials Accept (no changes will be made)...',
               submitMessage: 'Accepting Credential on Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setDid(
          tx: xrpl.DIDSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating DID Set (no changes will be made)...',
               submitMessage: 'Setting DID on Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async deleteDid(
          tx: xrpl.DIDDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating DID Delete (no changes will be made)...',
               submitMessage: 'Deleting DID on Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async delegateActions(
          tx: xrpl.DelegateSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Delegate Action (no changes will be made)...',
               submitMessage: 'Delegating Action on Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }
}
