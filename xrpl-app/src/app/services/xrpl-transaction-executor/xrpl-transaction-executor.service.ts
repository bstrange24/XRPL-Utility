import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { PrepareTxEnvironmentResult } from '../transaction-environment/tx-environment.service';

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
     public readonly xrplCache = inject(XrplCacheService);
     public readonly xrplService = inject(XrplService);
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
                         return { success: false, hash: '', error: 'Failed to sign transaction.' };
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

     async execute<T extends xrpl.Transaction>(
          client: xrpl.Client,
          wallet: xrpl.Wallet,
          tx: T,
          options: TxExecutionOptions & { isSimulateEnabled?: boolean; useMultiSign?: boolean; multiSignAddress?: string; multiSignSeeds?: string; regularKeyAddress?: string; isRegularKeyAddress?: boolean; regularKeySeed?: string; suppressIndividualFeedback?: boolean; paymentType?: string; amount?: any; destination?: string; submitAndWait?: boolean }
     ): Promise<{ success: true; hash: string } | { success: false; hash: string; error: string }> {
          const { isSimulateEnabled = false, simulateMessage, submitMessage, insufficientXrpMessage = 'Insufficient XRP to complete transaction', useMultiSign = false, multiSignAddress = '', multiSignSeeds = '', regularKeyAddress = '', isRegularKeyAddress = false, regularKeySeed = '', suppressIndividualFeedback = false, paymentType = 'XRP', amount = '0', destination = '', submitAndWait = false } = options;

          if (!isSimulateEnabled) this.txUiService.currentStep.set('preparing');

          // 1. Get fresh data in parallel
          const [accountInfo, { fee, serverInfo }] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false })]);

          // 2. Balance check
          if (paymentType === 'XRP') {
               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, amount, wallet.classicAddress, tx, fee)) {
                    return { success: false, hash: '', error: insufficientXrpMessage };
               }
          } else if (paymentType === 'IOU') {
               const accountLines = await this.xrplCache.getAccountLines(client, wallet.classicAddress, false);
               if (this.utilsService.isInsufficientIouTrustlineBalance(accountLines, tx, destination)) {
                    return { success: false, hash: '', error: 'Insufficent IOU balance for this transaction' };
               }
          }

          // 3. Show spinner
          this.txUiService.showSpinnerWithDelay(isSimulateEnabled ? simulateMessage : submitMessage, 200);

          // 4. Set preview
          this.txUiService.addTxSignal(tx);

          let response: any;

          try {
               if (isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
                    this.txUiService.addTxResultSignal(response.result);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(useMultiSign, regularKeyAddress, isRegularKeyAddress, regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, tx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, useMultiSign, multiSignAddress, multiSignSeeds);

                    if (!signedTx) {
                         return { success: false, hash: '', error: 'Failed to sign transaction.' };
                    }

                    if (submitAndWait) {
                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    } else {
                         response = await this.xrplTransactions.submitTransaction1(client, signedTx);
                    }

                    this.txUiService.currentStep.set('waiting_validation');
               }

               // 5. Handle result
               // this.txUiService.addTxResultSignal(response.result);

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

               // this.txUiService.addTxHashSignal(hash);

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
               // this.txUiService.spinner.set(false);
          }
     }

     async executeSimulate<T extends xrpl.Transaction>(client: xrpl.Client, wallet: xrpl.Wallet, tx: any, env: PrepareTxEnvironmentResult, txOptions: any): Promise<{ success: boolean; hash?: string; error?: string }> {
          try {
               this.txUiService.addTxSignal(tx);

               let response: any;

               if (txOptions.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
                    this.txUiService.addTxResultSignal(response.result);
               }

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    return this.handleFailedTx<T>(response);
               }

               const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';

               // Success for multi-tx: Show multi-tx success message without hash, then add hash signals for each individual tx
               if (txOptions.suppressIndividualFeedback) {
                    this.txUiService.setSuccessMultiTransactions(this.txUiService.result());
               }

               // Success for single tx:
               // Show success message with hash immediately, then add hash signal (which won't trigger a new success message since it's the same tx)
               if (!txOptions.suppressIndividualFeedback) {
                    this.txUiService.addTxHashSignal(hash);
                    this.txUiService.setSuccess(this.txUiService.result()); // ← Only for single tx
               }

               return { success: true, hash };
          } catch (err: any) {
               return {
                    success: false,
                    error: err.message || 'Execution failed',
               };
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

     async ticketCreate(
          tx: xrpl.TicketCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated Ticket create (no changes will be made)...',
               submitMessage: 'Submitting Ticket create to Ledger...',
               amount: '0',
               ...options,
          });
     }

     async ticketDelete(
          tx: xrpl.AccountSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               suppressIndividualFeedback?: boolean;
               customSpinnerMessage?: string; // ← NEW: Allow custom message
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: options.customSpinnerMessage ?? 'Simulated Ticket delete (no changes will be made)...',
               submitMessage: options.customSpinnerMessage ?? 'Submitting Ticket delete to Ledger...',
               amount: '0',
               suppressIndividualFeedback: options.suppressIndividualFeedback,
               ...options,
          });
     }

     async sendXrpPayment(
          tx: xrpl.Payment,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated XRP payment (no changes will be made)...',
               submitMessage: 'Submitting XRP payment to Ledger...',
               amount: this.txUiService.amountField(),
               ...options,
          });
     }

     async checkCreate(
          tx: xrpl.CheckCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               amount?: any;
               paymentType?: string;
               destination?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated Check create (no changes will be made)...',
               submitMessage: 'Submitting Check create to Ledger...',
               ...options,
          });
     }

     async checkCancel(
          tx: xrpl.CheckCancel,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated Check cancel (no changes will be made)...',
               submitMessage: 'Submitting Check cancel to Ledger...',
               amount: '0',
               ...options,
          });
     }

     async checkCash(
          tx: xrpl.CheckCash,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               paymentType?: string;
               suppressIndividualFeedback?: boolean;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated Check cash (no changes will be made)...',
               submitMessage: 'Submitting Check cash to Ledger...',
               amount: '0',
               ...options,
          });
     }

     async createCredential(
          env: any,
          tx: xrpl.CredentialCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating Create Credentials (no changes will be made)...',
               submitMessage: 'Submitting Create Credentials to Ledger...',
               amount: '0',
               ...options,
          });
     }

     async deleteCredential(
          env: any,
          tx: xrpl.CredentialDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating Delete Credentials (no changes will be made)...',
               submitMessage: 'Deleting Credential from Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async acceptCredential(
          env: any,
          tx: xrpl.CredentialAccept,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating Credentials Accept (no changes will be made)...',
               submitMessage: 'Accepting Credential on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setDid(
          env: any,
          tx: xrpl.DIDSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating DID Set (no changes will be made)...',
               submitMessage: 'Setting DID on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async deleteDid(
          env: any,
          tx: xrpl.DIDDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating DID Delete (no changes will be made)...',
               submitMessage: 'Deleting DID on the XRP Ledger...',
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
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Delegate Action (no changes will be made)...',
               submitMessage: 'Delegating Action on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async accountDelete(
          env: any,
          tx: xrpl.AccountDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.executeTx(env, client, wallet, tx, {
               simulateMessage: 'Simulating Account Delete (no changes will be made)...',
               submitMessage: 'Deleting Account on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async permissionedDomainSet(
          tx: xrpl.PermissionedDomainSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Permissioned Domain Set (no changes will be made)...',
               submitMessage: 'Setting Permissioned Domain on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async permissionedDomainDelete(
          tx: xrpl.PermissionedDomainDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Permission Domain Delete (no changes will be made)...',
               submitMessage: 'Deleting Permission Domain on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createEscrow(
          tx: xrpl.EscrowCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow create (no changes will be made)...',
               submitMessage: 'Creating escrow on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async finishEscrow(
          tx: xrpl.EscrowFinish,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow finish (no changes will be made)...',
               submitMessage: 'Finishing escrow on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async cancelEscrow(
          tx: xrpl.EscrowCancel,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow cancel (no changes will be made)...',
               submitMessage: 'Cancelling escrow on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async paymentChannelCreate(
          tx: xrpl.PaymentChannelCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Payment Channel creation (no changes will be made)...',
               submitMessage: 'Creating Payment Channel on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async paymentChannelFundTx(
          tx: xrpl.PaymentChannelFund,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Payment Channel funding (no changes will be made)...',
               submitMessage: 'Funding Payment Channel on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async paymentChannelClaimTx(
          tx: xrpl.PaymentChannelClaim,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Payment Channel action (no changes will be made)...',
               submitMessage: 'Sending Payment Channel action to the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setTrustline(
          tx: xrpl.TrustSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               paymentType?: string;
               suppressIndividualFeedback?: boolean;
               submitAndWait?: boolean;
               customSpinnerMessage?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Trustline set (no changes will be made)...',
               submitMessage: 'Setting Trustline on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async removeTrustline(
          tx: xrpl.TrustSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Trustline removal (no changes will be made)...',
               submitMessage: 'Removing Trustline on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async issueCurrency(
          tx: xrpl.Payment,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               paymentType?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Currency issuance (no changes will be made)...',
               submitMessage: 'Issuing Currency on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async clawbackTokens(
          tx: xrpl.Clawback,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Token Clawback (no changes will be made)...',
               submitMessage: 'Clawing back token on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptCreate(
          tx: xrpl.MPTokenIssuanceCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT create (no changes will be made)...',
               submitMessage: 'Creating MPT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptAuthUnauth(
          tx: xrpl.MPTokenAuthorize,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT Authorization (no changes will be made)...',
               submitMessage: 'Modifying MPT Authorization on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptLockUnlock(
          tx: xrpl.MPTokenIssuanceSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT Lock/Unlock Clawback (no changes will be made)...',
               submitMessage: 'Executing MPT Lock/Unlock on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptSend(
          tx: xrpl.Payment,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT send (no changes will be made)...',
               submitMessage: 'Sending MPT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptDestroy(
          tx: xrpl.MPTokenIssuanceDestroy,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT destroy (no changes will be made)...',
               submitMessage: 'Destroying MPT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mptClawback(
          tx: xrpl.Clawback,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating MPT Clawback (no changes will be made)...',
               submitMessage: 'Clawing back MPT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async mintNft(
          tx: xrpl.NFTokenMint,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT mint (no changes will be made)...',
               submitMessage: 'Minting NFT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async burnNft(
          tx: xrpl.NFTokenBurn,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT burn (no changes will be made)...',
               submitMessage: 'Burned NFT on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async updateNftMetaData(
          tx: xrpl.NFTokenModify,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Nft meta data update (no changes will be made)...',
               submitMessage: 'Updating NFT meta data on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createBuyNft(
          tx: xrpl.NFTokenAcceptOffer,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT buy (no changes will be made)...',
               submitMessage: 'Submitting NFT buy on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createSellNft(
          tx: xrpl.NFTokenCreateOffer,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT sell (no changes will be made)...',
               submitMessage: 'Submitting NFT sell on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createNftOffer(
          tx: xrpl.NFTokenCreateOffer,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT offer create (no changes will be made)...',
               submitMessage: 'Creating NFT offer on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async cancelNftOffer(
          tx: xrpl.NFTokenCancelOffer,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT offer cancel (no changes will be made)...',
               submitMessage: 'Cancelling NFT offer on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     /// Firewall
     async createFirewall(
          tx: xrpl.MPTokenIssuanceCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Firewall create (no changes will be made)...',
               submitMessage: 'Creating Firewall on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async modifyFirewall(
          tx: xrpl.MPTokenAuthorize,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Firewall modification (no changes will be made)...',
               submitMessage: 'Modifying Firewall on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async authorizeFlag(
          tx: xrpl.Payment,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Firewall authorization (no changes will be made)...',
               submitMessage: 'Authorizing Firewall on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async deleteFirewall(
          tx: xrpl.MPTokenIssuanceDestroy,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Firewall delete (no changes will be made)...',
               submitMessage: 'Deleteing Firewall on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async updateAccountFlags(
          tx: xrpl.AccountSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating setting account flag (no changes will be made)...',
               submitMessage: 'Setting account flag on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setMultiSign(
          tx: xrpl.SignerListSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating setting signer (no changes will be made)...',
               submitMessage: 'Setting signer list on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setRegularKey(
          tx: xrpl.SetRegularKey,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating setting regular key (no changes will be made)...',
               submitMessage: 'Setting regular key on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async setDepositAuth(
          tx: xrpl.DepositPreauth,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               suppressIndividualFeedback?: boolean;
               customSpinnerMessage?: string; // ← NEW: Allow custom message
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating setting deposit authorization (no changes will be made)...',
               submitMessage: 'Setting deposit authorization on the XRP Ledger...',
               amount: '0',
               suppressIndividualFeedback: options.suppressIndividualFeedback,
               ...options,
          });
     }

     async setNftMinterAddress(
          tx: xrpl.AccountSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               suppressIndividualFeedback?: boolean;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating NFT minter address change (no changes will be made)...',
               submitMessage: 'Modifying NFT minter address on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async updateMetaData(
          tx: xrpl.AccountSet,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating meta data update (no changes will be made)...',
               submitMessage: 'Updated meta data on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createAMM(
          tx: xrpl.AMMCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating AMM create (no changes will be made)...',
               submitMessage: 'Creating AMM on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async depositToAMM(
          tx: xrpl.AMMDeposit,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating deposit to AMM (no changes will be made)...',
               submitMessage: 'Depositing assets to AMM on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async withdrawlFromAMM(
          tx: xrpl.AMMWithdraw,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating withdrawl from AMM (no changes will be made)...',
               submitMessage: 'Withdrawling assets to AMM on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async clawbackFromAMM(
          tx: xrpl.AMMClawback,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating clawaback from AMM (no changes will be made)...',
               submitMessage: 'Clawing back AMM assets on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async swapViaAMM(
          tx: xrpl.Payment,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating swap via AMM (no changes will be made)...',
               submitMessage: 'Swaping AMM assets on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async deleteAMM(
          tx: xrpl.AMMDelete,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating AMM delete (no changes will be made)...',
               submitMessage: 'Deleting AMM on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async createOffer(
          tx: xrpl.OfferCreate,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Offer create (no changes will be made)...',
               submitMessage: 'Creating offer on the XRP Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }

     async offerCancel(
          tx: xrpl.OfferCancel,
          wallet: xrpl.Wallet,
          client: xrpl.Client,
          options: {
               useMultiSign?: boolean;
               multiSignAddress?: string;
               multiSignSeeds?: string;
               isRegularKeyAddress?: boolean;
               regularKeyAddress?: string;
               regularKeySeed?: string;
               suppressIndividualFeedback?: boolean;
               customSpinnerMessage?: string; // ← NEW: Allow custom message
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Offer cancel (no changes will be made)...',
               submitMessage: 'Cancelling offer on the XRP Ledger...',
               amount: '0',
               suppressIndividualFeedback: options.suppressIndividualFeedback,
               ...options,
          });
     }
}
