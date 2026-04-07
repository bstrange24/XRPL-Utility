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
import { OfferState } from '../offer-store/offer-store.service';

@Injectable({
     providedIn: 'root',
})
export class OfferTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     private readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     private readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     private readonly offerTransactionBuilderService = inject(OfferTransactionBuilderService);

     async executeOfferTx(type: OfferTxType, config: OfferTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const { offer, account, txOptions, preFetchedEnv, wallet } = config;
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

               const effectiveWallet: xrpl.Wallet = env.wallet || wallet;

               if (type === 'createOffer') {
                    return await this.executeCreateOffer(offer, account, txOptions, env, client, effectiveWallet);
               } else if (type === 'cancelOffer') {
                    return await this.executeCancelOffer(offer, account, txOptions, env, client, effectiveWallet);
               }

               throw new Error(`Unknown offer transaction type: ${type}`);
          } catch (err: any) {
               console.error(`[${type}] executeOfferTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private async executeCreateOffer(offer: OfferState, account: any, txOptions: any, env: any, client: xrpl.Client, wallet: xrpl.Wallet): Promise<{ success: boolean; hash?: string; error?: string }> {
          const tx = this.offerTransactionBuilderService.buildOfferCreateTx(wallet, offer, env);

          await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet as any, offer, 'createOffer', txOptions);

          const balanceCheck = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
          if (!balanceCheck.success) return { success: false, error: balanceCheck.error };

          const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
               client,
               wallet,
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

          if (!submitOrSimResult.success) return { success: false, error: submitOrSimResult.error };

          const txHash = submitOrSimResult.hash;

          if (submitOrSimResult.mode === 'simulate') {
               this.txUiService.resetCurrentStepToIdle();
               this.toastService.success('Simulated Offer Create successfully!', AppConstants.TOAST.SUCCESS, false, txHash, this.txUiService.explorerUrl() + 'tx/');
               return { success: true, hash: txHash };
          }

          const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
          this.txUiService.setTxResultSignal(finalResult);
          this.xrplTransactionService.processTxFinalResult(finalResult, 'Offer created successfully!', { success: true, hash: txHash });
          return { success: true, hash: txHash };
     }

     private async executeCancelOffer(offer: OfferState, account: any, txOptions: any, env: any, client: xrpl.Client, wallet: xrpl.Wallet): Promise<{ success: boolean; hash?: string; error?: string }> {
          const sequences = offer.offerSequenceField
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (sequences.length === 0) {
               return { success: false, error: 'No offer sequences provided.' };
          }

          const total = sequences.length;
          const isSimulate = txOptions?.isSimulateEnabled;
          // this.txUiService.showSpinnerWithDelay(isSimulate ? `Simulating deletion of ${total} offer(s)...` : `Cancelling ${total} offer(s)...`, 200);

          const deletedHashes: string[] = [];
          let successCount = 0;

          for (let i = 0; i < sequences.length; i++) {
               const sequence = Number(sequences[i]);
               const progressMsg = isSimulate ? `Simulating offer ${i + 1}/${total}...` : `Cancelling offer ${i + 1}/${total}...`;
               // this.txUiService.updateSpinnerMessage(progressMsg);

               const freshLedger = await env.client.getLedgerIndex();
               const cancelEnv = { ...env, ledgerInfo: { lastIndex: freshLedger } };
               const tx = this.offerTransactionBuilderService.buildOfferCancelTx(wallet, sequence, cancelEnv);

               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet as any, offer, 'cancelOffer', txOptions);

               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet,
                    env,
                    mode: isSimulate ? 'simulate' : 'submit',
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

               if (!submitOrSimResult.success) {
                    return { success: false, error: submitOrSimResult.error };
               }

               successCount++;
               if (submitOrSimResult.hash) deletedHashes.push(submitOrSimResult.hash);
          }

          if (successCount > 0) {
               deletedHashes.forEach(hash => this.txUiService.addTxHashSignal(hash));
          }

          const successMsg = isSimulate ? `Simulated cancel of ${successCount} offer(s) successfully!` : `${successCount} offer(s) cancelled successfully!`;
          this.toastService.success(successMsg, AppConstants.TOAST.SUCCESS);
          return { success: true, hash: deletedHashes[0] };
     }
}
