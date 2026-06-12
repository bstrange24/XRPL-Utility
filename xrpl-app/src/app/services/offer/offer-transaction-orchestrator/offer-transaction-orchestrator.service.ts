import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { OfferTxType, OfferTxConfig } from '../../../components/offer/constants/offer.types';
import { AppConstants } from '../../../core/app.constants';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { OfferTransactionBuilderService } from '../offer-transaction-builder/offer-transaction-builder.service';

type OfferMeta = {
     buildTx: (args: { orchestrator: OfferTransactionOrchestratorService; env: any; wallet: any; offer: any; account: any; txOptions: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: OfferTransactionOrchestratorService; offer: any; txOptions: any }) => string;
     successMessage: (args: { orchestrator: OfferTransactionOrchestratorService; offer: any; txOptions: any }) => string;
};

const OFFER_META: Record<OfferTxType, OfferMeta> = {
     createOffer: {
          buildTx: ({ orchestrator, env, wallet, offer }) => orchestrator.offerTransactionBuilderService.buildOfferCreateTx(env.wallet || wallet, offer, env),
          simulationToastMessage: () => 'Simulated Offer Create successfully!',
          successMessage: () => 'Offer created successfully!',
     },

     cancelOffer: {
          buildTx: ({ orchestrator, env, wallet, offer, txOptions }) => {
               // For cancel we use the first sequence as representative (loop uses per-sequence)
               const sequence = offer.offerSequenceField
                    .split(',')
                    .map((s: string) => s.trim())
                    .find(Boolean);
               const firstSeq = Number(sequence || 0);
               return orchestrator.offerTransactionBuilderService.buildOfferCancelTx(env.wallet || wallet, firstSeq, env);
          },

          simulationToastMessage: ({ offer, txOptions }) => {
               const count = offer.offerSequenceField
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean).length;
               return `Simulated cancel of ${count} offer(s) successfully!`;
          },

          successMessage: ({ offer }) => {
               const count = offer.offerSequenceField
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean).length;
               return `${count} offer(s) cancelled successfully!`;
          },
     },
};

@Injectable({ providedIn: 'root' })
export class OfferTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     private readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     private readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly offerTransactionBuilderService = inject(OfferTransactionBuilderService);

     async executeOfferTx(type: OfferTxType, config: OfferTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; deletedHashes?: { sequence: number; hash: string }[] }> {
          const { offer, account, txOptions, preFetchedEnv, wallet } = config;
          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

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
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               // Special handling for multi-cancel
               if (type === 'cancelOffer') {
                    return await this.executeCancelOffersLoop(config, env, client);
               }

               // ── Single transaction path (createOffer) ─────────────────────────────
               const meta = OFFER_META[type];
               const tx = meta.buildTx({ orchestrator: this, env, wallet, offer, account, txOptions });

               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, offer, type, txOptions);

               const balanceCheck = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!balanceCheck.success) {
                    return { success: false, error: balanceCheck.error };
               }

               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,
                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
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

               if (!submitOrSimResult.success) {
                    return { success: false, error: submitOrSimResult.error };
               }

               txHash = submitOrSimResult.hash;

               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, offer, txOptions, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);

               this.txUiService.setTxResultSignal(finalResult);
               const message = meta.successMessage({ orchestrator: this, offer, txOptions });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeOfferTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     /** Handles multi-offer cancellation  */
     private async executeCancelOffersLoop(config: OfferTxConfig, env: any, client: xrpl.Client): Promise<{ success: boolean; hash?: string; error?: string; deletedHashes?: { sequence: number; hash: string }[] }> {
          const { offer, account, txOptions } = config;
          const meta = OFFER_META['cancelOffer'];

          const sequences: number[] = offer.offerSequenceField
               .split(',')
               .map((s: string) => Number(s.trim()))
               .filter(n => !Number.isNaN(n) && n > 0);

          if (sequences.length === 0) {
               return { success: false, error: 'No offer sequences provided.' };
          }

          const isSimulate = txOptions?.isSimulateEnabled;

          // Simulate path - use representative first offer
          if (isSimulate) {
               const firstOffer = { ...offer, offerSequenceField: sequences[0].toString() };
               const tx = meta.buildTx({ orchestrator: this, env, wallet: config.wallet, offer: firstOffer, account, txOptions });

               await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || config.wallet,
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

               return this.handleSimulationSuccess('cancelOffer', offer, txOptions, '');
          }

          // Submit path - loop
          this.txUiService.currentStep?.set('preparing');
          this.toastService.info(`Cancelling ${sequences.length} offer(s)...`, AppConstants.TOAST.INFO);

          const deletedHashes: { sequence: number; hash: string }[] = [];
          let successCount = 0;

          for (const sequence of sequences) {
               const perOffer = { ...offer, offerSequenceField: sequence.toString() };
               const freshLedger = await client.getLedgerIndex();
               const cancelEnv = { ...env, ledgerInfo: { lastIndex: freshLedger } };

               const tx = this.offerTransactionBuilderService.buildOfferCancelTx(env.wallet || config.wallet, sequence, cancelEnv);

               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, config.wallet, perOffer, 'cancelOffer', txOptions);

               const submitResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || config.wallet,
                    env: cancelEnv,
                    mode: 'submit',
                    skipBalanceCheck: true,
                    ui: { suppressIndividualFeedback: true },
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
                    this.toastService.error(`Failed to cancel offer ${sequence}: ${submitResult.error ?? 'Unknown error'}`);
                    continue;
               }

               successCount++;
               if (submitResult.hash) {
                    deletedHashes.push({ sequence, hash: submitResult.hash });
               }
          }

          // Wait for final outcomes
          for (const { hash, sequence } of deletedHashes) {
               try {
                    const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, hash, env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
                    this.txUiService.addTxResultSignal(finalResult);
               } catch (waitError) {
                    console.warn(`Confirmation wait failed for offer ${sequence}:`, waitError);
               }
          }

          if (successCount === 0) {
               return { success: false, error: 'All offer cancellations failed.' };
          }

          const message = meta.successMessage({ orchestrator: this, offer, txOptions });
          this.toastService.successMultipleHashesWithTickets?.(
               message,
               deletedHashes.map(d => ({ ticketSeq: d.sequence.toString(), hash: d.hash })), // reuse existing toast if adapted
               this.txUiService.explorerUrl() + 'tx/',
               AppConstants.TOAST.SUCCESS
          ) ?? this.toastService.success(message, AppConstants.TOAST.SUCCESS);

          this.txUiService.currentStep?.set('success');

          return {
               success: true,
               hash: deletedHashes.at(-1)?.hash,
               deletedHashes,
          };
     }

     private handleSimulationSuccess(type: OfferTxType, offer: any, txOptions: any, hash?: string) {
          const meta = OFFER_META[type];
          const msg = meta.simulationToastMessage({ orchestrator: this, offer, txOptions });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
