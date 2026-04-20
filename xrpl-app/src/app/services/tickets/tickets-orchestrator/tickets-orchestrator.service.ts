import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TICKET_TX_TYPES, TICKET_VALIDATION_RULES, TicketTxType } from '../../../components/tickets/constants/tickets.constants';
import { TicketTxConfig } from '../../../components/tickets/constants/tickets.types';
import { TicketsTransactionBuilderService } from '../tickets-transaction-builder/tickets-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';

type TicketMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; ticket: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: TicketsOrchestratorService; env: any; wallet: any; ticket: any; account: any; txOptions: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: TicketsOrchestratorService; ticket: any; txOptions: any }) => string;
     successMessage: (args: { orchestrator: TicketsOrchestratorService; ticket: any; txOptions: any }) => string;
};

const TICKET_META: Record<TicketTxType, TicketMeta> = {
     createTicket: {
          validationRule: TICKET_VALIDATION_RULES[TICKET_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, ticket, account, txOptions }) => ({
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
               createTicket: { amount: txOptions.ticketCountField },
          }),
          buildTx: ({ orchestrator, env, wallet, ticket, account, txOptions }) => orchestrator.ticketsTransactionBuilderService.buildCreateTicketTx(env.wallet || wallet, env, ticket, account, txOptions),
          simulationToastMessage: ({ orchestrator, ticket, txOptions }) => `Simulated Creating ${txOptions.ticketCountField} Tickets`,
          successMessage: ({ orchestrator, ticket, txOptions }) => {
               return `Successfully Created ${txOptions.ticketCountField} Tickets`;
          },
     },
     deleteTicket: {
          validationRule: TICKET_VALIDATION_RULES[TICKET_TX_TYPES.DELETE],
          buildValidationInputs: ({ wallet, env, ticket, account, txOptions }) => ({
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
               deleteTicket: { ticketId: ticket.ticketId },
          }),
          buildTx: ({ orchestrator, env, wallet, ticket, account, txOptions }) => orchestrator.ticketsTransactionBuilderService.buildDeleteTicketTx(env.wallet || wallet, env, ticket, account, txOptions),
          simulationToastMessage: ({ ticket, txOptions }) => `Simulated Cancelling Ticket ${ticket.ticketId}`,
          successMessage: ({ ticket, txOptions }) => `Successfully Cancelled Ticket ${ticket.ticketId}`,
     },
};

@Injectable({ providedIn: 'root' })
export class TicketsOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly ticketsTransactionBuilderService = inject(TicketsTransactionBuilderService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);

     async executeTicketTx(type: TicketTxType, config: TicketTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any; deletedHashes?: { ticketSeq: string; hash: string }[] }> {
          const { ticket, account, txOptions, preFetchedEnv, wallet } = config;
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

               // ── deleteTicket: loop over every selected sequence ──────────────
               if (type === 'deleteTicket') {
                    return await this.executeDeleteTicketsLoop(config, env, client);
               }

               // ── All other types: single-tx path ──────────────────────────────
               const meta = TICKET_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, ticket, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, ticket, account, txOptions });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.ticket, type, txOptions);

               // Balance check
               let isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
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
                    return this.handleSimulationSuccess(type, ticket, txOptions, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, ticket, txOptions });
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

     /** Loops over txOptions.selectedTicketSequences and deletes each one. */
     private async executeDeleteTicketsLoop(config: TicketTxConfig, env: any, client: xrpl.Client): Promise<{ success: boolean; hash?: string; error?: string; deletedHashes?: { ticketSeq: string; hash: string }[] }> {
          const { ticket, account, txOptions, wallet } = config;
          const meta = TICKET_META['deleteTicket'];

          const sequences: string[] = txOptions?.selectedTicketSequences ?? [];
          if (sequences.length === 0) {
               return { success: false, error: 'No tickets selected to delete.' };
          }

          // Validate once using the first ticket (wallet/network rules are the same for all)
          const firstTicketConfig = { ...ticket, ticketId: sequences[0] };
          const validationInputs = meta.buildValidationInputs({ wallet, env, ticket: firstTicketConfig, account, txOptions });
          const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
          if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true } as any;

          // Simulate path: single representative simulation
          if (txOptions?.isSimulateEnabled) {
               const tx = meta.buildTx({ orchestrator: this, env, wallet, ticket: firstTicketConfig, account, txOptions });
               const simResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,
                    mode: 'simulate',
                    skipBalanceCheck: true,
                    ui: { suppressIndividualFeedback: false },
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
               return this.handleSimulationSuccess('deleteTicket', { ticketId: sequences[0], amount: sequences.length }, txOptions, '');
          }

          // Submit path: loop
          if (!txOptions?.isSimulateEnabled) {
               this.txUiService.currentStep?.set('preparing');
               this.toastService.info(`Deleting ${sequences.length} ticket(s)...`, AppConstants.TOAST.INFO);
          }

          const deletedHashes: { ticketSeq: string; hash: string }[] = [];
          let successCount = 0;

          for (const ticketSeq of sequences) {
               const perTicket = { ...ticket, ticketId: ticketSeq };
               const tx = meta.buildTx({ orchestrator: this, env, wallet, ticket: perTicket, account, txOptions });

               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, perTicket, 'deleteTicket', txOptions);

               const submitResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,
                    mode: 'submit',
                    skipBalanceCheck: true,
                    ui: { suppressIndividualFeedback: true }, // suppress per-ticket; show summary at end
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

               if (!submitResult.success) {
                    this.toastService.error(`Failed to delete ticket ${ticketSeq}: ${submitResult.error ?? 'Unknown error'}`);
                    continue;
               }

               successCount++;
               if (submitResult.hash) deletedHashes.push({ ticketSeq, hash: submitResult.hash });
          }

          // Wait for final outcome on each submitted tx
          for (const { hash, ticketSeq } of deletedHashes) {
               try {
                    const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, hash, env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
                    this.txUiService.addTxResultSignal(finalResult);
               } catch (waitError: any) {
                    console.warn(`Confirmation wait failed for ticket ${ticketSeq} (${hash.slice(0, 8)}...):`, waitError);
               }
          }

          if (successCount === 0) {
               return { success: false, error: 'All ticket deletions failed.' };
          }

          // Summary toast (matches old deleteTickets behaviour)
          const msg = `${successCount} ticket(s) deleted successfully!`;
          this.toastService.successMultipleHashesWithTickets(msg, deletedHashes, this.txUiService.explorerUrl() + 'tx/', AppConstants.TOAST.SUCCESS);
          this.txUiService.currentStep?.set('success');

          return { success: true, deletedHashes, hash: deletedHashes[deletedHashes.length - 1]?.hash };
     }

     handleSimulationSuccess(type: TicketTxType, ticket: any, txOptions: any, hash?: string) {
          const msg = TICKET_META[type].simulationToastMessage({ orchestrator: this, ticket, txOptions });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
