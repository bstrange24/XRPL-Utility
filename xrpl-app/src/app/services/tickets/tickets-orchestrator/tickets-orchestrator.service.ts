import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../toast/toast.service';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

interface TicketConfig {
     wallet: Wallet;
     formValues: {
          ticketCountField?: string;
          ticketSequences?: string[];
          isSimulate?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string;
          [key: string]: any;
     };
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          wallet?: any;
     };
}

@Injectable({ providedIn: 'root' })
export class TicketsOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);

     async executeCreateTickets(config: TicketConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, preFetchedEnv } = config;
          const { isSimulate = false, useMultiSign = false, ticketCountField } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // 1. Use pre-fetched env if provided, otherwise fetch fresh
               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Pre-fetched environment missing required fields');
                    }
               } else {
                    const envData = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    env = envData;
                    client = envData.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               // 2. Validation
               const validationInputs = {
                    wallet,
                    network: {
                         accountInfo: env.accountInfo,
                         accountObjects: env.accountObjects,
                         fee: env.fee,
                         currentLedger: env.currentLedger,
                    },
                    createTicket: {
                         ticketCountField: ticketCountField!,
                    },
                    regularKey: {
                         isRegularKey: formValues.isRegularKeyAddress,
                         address: formValues.regularKeyAddress,
                         seed: formValues.regularKeySeed,
                    },
               };

               const errors = await this.validator.validate('CreateTicket', {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               // 3. Build transaction
               const ticketCreateTx: xrpl.TicketCreate = this.xrplTransactionService.buildTicketCreateTransaction(env.wallet, ticketCountField!, env.fee, env.currentLedger);

               // 4. Apply optional fields (moved here from component)
               await this.applyOptionalFields(client, ticketCreateTx, wallet);

               // 5. Execute
               const execResult = await this.executor.ticketCreate(ticketCreateTx, env.wallet, client, {
                    useMultiSign: useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulate) {
                    this.txUiService.resetCurrentStepToIdle();
                    this.toastService.success(`Simulated creation of ${ticketCountField} ticket(s)`, AppConstants.TOAST.SUCCESS, false, txHash, this.txUiService.explorerUrl() + 'tx/');
                    return { success: true, hash: txHash };
               }

               // 6. Wait for final outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, ticketCreateTx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);
               this.xrplTransactionService.processTxFinalResult(finalResult, `Created ${ticketCountField} ticket(s)`, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during ticket creation';
               console.error('[executeCreateTickets] execute failed:', err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     async deleteTickets(config: TicketConfig): Promise<{ success: boolean; deletedCount?: number; deletedHashes?: { ticketSeq: string; hash: string }[]; error?: string }> {
          const { wallet, formValues, preFetchedEnv } = config;
          const { isSimulate = false, useMultiSign = false, ticketSequences = [] } = formValues;

          let client: xrpl.Client;
          let fee: string;
          let currentLedger: number;
          let accountObjects: xrpl.AccountObjectsResponse | undefined;
          let deletedResults: { ticketSeq: string; hash: string }[] = [];
          let successCount = 0;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // 1. Prepare environment (reuse pre-fetched or fetch fresh)
               let env;
               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;
                    fee = preFetchedEnv.fee;
                    currentLedger = preFetchedEnv.currentLedger;
                    accountObjects = preFetchedEnv.accountObjects;
               } else {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeTickets: true, // important for delete
                    });
                    client = env.client;
                    fee = env.fee!;
                    currentLedger = env.currentLedger!;
                    accountObjects = env.accountObjects;
               }

               if (!accountObjects || ticketSequences.length === 0) {
                    throw new Error('No tickets selected or failed to load account objects');
               }

               // 2. Filter valid/existing tickets
               const existingTickets = new Set(accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'Ticket').map((obj: any) => String(obj.TicketSequence)));

               const validTickets = ticketSequences.filter((seq: string) => existingTickets.has(seq));
               const invalidTickets = ticketSequences.filter((seq: string) => !existingTickets.has(seq));

               if (validTickets.length === 0) {
                    const list = invalidTickets.map((n: any) => `<code>${n}</code>`).join(', ');
                    return {
                         success: false,
                         error: `None of the selected tickets exist. Invalid: ${list || 'none'}`,
                    };
               }

               if (invalidTickets.length > 0) {
                    const list = invalidTickets.map((n: any) => `<code>${n}</code>`).join(', ');
                    this.toastService.info(`Some tickets not found and skipped: ${list}`, AppConstants.TOAST.INFO);
               }

               // 3. Show starting feedback
               if (!isSimulate) {
                    this.txUiService.currentStep.set('preparing');
                    this.toastService.info(`Deleting ${validTickets.length} ticket(s)...`, AppConstants.TOAST.INFO);
               }

               // 4. Execute deletions one by one (XRPL doesn't support batch delete in one tx)
               for (const ticketSeq of validTickets) {
                    const tx: xrpl.AccountSet = this.xrplTransactionService.buildTicketDeleteTransaction(env.wallet, ticketSeq, fee, currentLedger);

                    // Apply optional fields (memo, pay with another ticket, etc.)
                    await this.applyOptionalFields(client, tx, wallet);

                    const execResult = await this.executor.ticketDelete(tx, env.wallet, client, {
                         useMultiSign: formValues.useMultiSign,
                         isRegularKeyAddress: formValues.isRegularKeyAddress,
                         regularKeyAddress: formValues.regularKeyAddress,
                         regularKeySeed: formValues.regularKeySeed,
                         multiSignAddress: formValues.multiSignAddress,
                         multiSignSeeds: formValues.multiSignSeeds,
                         suppressIndividualFeedback: true, // we collect and show summary
                         customSpinnerMessage: `Deleting ticket ${ticketSeq}...`,
                    });

                    if (!execResult.success) {
                         this.toastService.error(`Failed to delete ticket ${ticketSeq}: ${execResult.error || 'Unknown error'}`);
                         continue;
                    }

                    successCount++;
                    if (execResult.hash) {
                         deletedResults.push({ ticketSeq, hash: execResult.hash });
                    }
               }

               // 5. Handle simulation early exit
               if (isSimulate) {
                    const msg = `Simulated deletion of ${successCount} ticket(s) successfully!`;
                    this.toastService.success(msg, AppConstants.TOAST.SUCCESS);
                    return { success: true, deletedCount: successCount, deletedHashes: deletedResults };
               }

               // 6. Wait for final outcomes (non-blocking per tx)
               const lastLedger = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

               for (const { hash, ticketSeq } of deletedResults) {
                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, hash, lastLedger);
                         this.txUiService.addTxResultSignal(finalResult);
                    } catch (waitError: any) {
                         console.warn(`Confirmation wait failed for ticket ${ticketSeq} (${hash.slice(0, 8)}...):`, waitError);
                         // continue — don't fail whole batch
                    }
               }

               // 7. Final feedback
               const msg = `${successCount} ticket(s) deleted successfully!`;
               this.toastService.successMultipleHashesWithTickets(msg, deletedResults, this.txUiService.explorerUrl() + 'tx/', AppConstants.TOAST.SUCCESS);
               this.txUiService.currentStep.set('success');

               return {
                    success: true,
                    deletedCount: successCount,
                    deletedHashes: deletedResults,
               };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during ticket deletion';
               console.error('[deleteTickets]', err);
               this.xrplTransactionService.processTxError(err);
               this.txUiService.currentStep.set('failed');
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: any, wallet: Wallet) {
          // Tickets
          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          const memo = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memo) this.utilsService.setMemoField(tx, memo);
     }
}
