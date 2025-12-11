// xrpl-transaction-executor.service.ts
import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';

export interface TxExecutionOptions {
     simulateMessage: string;
     submitMessage: string;
     insufficientXrpMessage?: string;
     amount?: string; // '0' for non-payment txs
}

@Injectable({ providedIn: 'root' })
export class XrplTransactionExecutorService {
     constructor(private xrplTransactions: XrplTransactionService, private utilsService: UtilsService, private txUiService: TransactionUiService, private xrplCache: XrplCacheService, private xrplService: XrplService) {}

     async execute<T extends xrpl.Transaction>(client: xrpl.Client, wallet: xrpl.Wallet, tx: T, options: TxExecutionOptions & { useMultiSign?: boolean; multiSignAddress?: string; multiSignSeeds?: string; isRegularKeyAddress?: boolean; regularKeySeed?: string; suppressIndividualFeedback?: boolean }): Promise<{ success: true; hash: string } | { success: false; error: string }> {
          const { simulateMessage, submitMessage, insufficientXrpMessage = 'Insufficient XRP to complete transaction', amount = '0', useMultiSign = false, multiSignAddress = '', multiSignSeeds = '', isRegularKeyAddress = false, regularKeySeed = '', suppressIndividualFeedback = false } = options;

          // 1. Get fresh data in parallel
          const [{ accountInfo, accountObjects }, { fee, serverInfo }] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false })]);

          // 2. Balance check
          if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, amount, wallet.classicAddress, tx, fee)) {
               return { success: false, error: insufficientXrpMessage };
          }

          // 3. Show spinner
          this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? simulateMessage : submitMessage, 200);

          // 4. Set preview
          this.txUiService.addTxSignal(tx);

          let response: any;

          try {
               if (this.txUiService.isSimulateEnabled()) {
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
               this.txUiService.addTxResultSignal(response.result);
               // this.txUiService.setTxResultSignal(response.result);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               // Inside XrplTransactionExecutorService.execute()

               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);

                    // CRITICAL: Keep this so your <app-transaction-preview> shows the nice message
                    if (response.result) {
                         (response.result as any).errorMessage = userMessage;
                    }

                    // Update the signal so preview updates immediately
                    this.txUiService.addTxResultSignal(response.result);

                    // Show error panel/toast
                    this.txUiService.setError(userMessage);

                    return { success: false, error: userMessage };
               }

               // Success!
               this.txUiService.setSuccess(this.txUiService.result);
               const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';

               // === ONLY show success UI if not suppressed ===
               // Add hash only if not suppressed
               if (!suppressIndividualFeedback) {
                    this.txUiService.addTxHashSignal(hash);
                    this.txUiService.setSuccess(this.txUiService.result); // ← Only for single tx
               }

               // this.txUiService.addTxHashSignal(hash);

               return { success: true, hash };
          } catch (err: any) {
               const msg = err.message || 'Unknown error during transaction';
               this.txUiService.setError(msg);
               return { success: false, error: msg };
          } finally {
               // Only hide spinner if not suppressed (let parent control it)
               if (!suppressIndividualFeedback) {
                    this.txUiService.spinner.set(false);
               }
               // this.txUiService.spinner.set(false);
          }
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
               regularKeySeed?: string;
          } = {}
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulated Check create (no changes will be made)...',
               submitMessage: 'Submitting Check create to Ledger...',
               amount: '0',
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
               regularKeySeed?: string;
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

     async accountDelete(
          tx: xrpl.AccountDelete,
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
               simulateMessage: 'Simulating Account Delete (no changes will be made)...',
               submitMessage: 'Deleting Account on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Permissioned Domain Set (no changes will be made)...',
               submitMessage: 'Setting Permissioned Domain on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Permission Domain Delete (no changes will be made)...',
               submitMessage: 'Deleting Permission Domain on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow create (no changes will be made)...',
               submitMessage: 'Creating escrow on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow finish (no changes will be made)...',
               submitMessage: 'Finishing escrow on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow cancel (no changes will be made)...',
               submitMessage: 'Cancelling escrow on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow cancel (no changes will be made)...',
               submitMessage: 'Cancelling escrow on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow cancel (no changes will be made)...',
               submitMessage: 'Cancelling escrow on Ledger...',
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
               regularKeySeed?: string;
          } = {} // ← Default empty object (optional)
     ): Promise<{ success: boolean; hash?: string; error?: string }> {
          return this.execute(client, wallet, tx, {
               simulateMessage: 'Simulating Escrow cancel (no changes will be made)...',
               submitMessage: 'Cancelling escrow on Ledger...',
               amount: '0',
               ...options, // ← Merge in the passed options (useMultiSign, etc.)
          });
     }
}
