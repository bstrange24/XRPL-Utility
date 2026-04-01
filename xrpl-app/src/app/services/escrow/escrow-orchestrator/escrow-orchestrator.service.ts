import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { UtilsService } from '../../util-service/utils.service';
import { ToastService } from '../../toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { EscrowUtilService } from '../escrow-util/escrow-util.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../core/app.constants';
import { ESCROW_TX_TYPES, ESCROW_VALIDATION_RULES, EscrowTxType } from '../../../components/escrow/constants/time-escrow.constants';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { EscrowConfig } from '../../../components/escrow/constants/time-escrow.types';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { EscrowTransactionBuilderService } from '../escrow-transaction-builder/escrow-transaction-builder.service';

type EscrowTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { orchestrator: EscrowOrchestratorService; wallet: Wallet; env: any; escrow: any; account: any; currency: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: EscrowOrchestratorService; env: any; wallet: any; escrow: any; currency: any; trustline: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: EscrowOrchestratorService; escrow: any; currency: any }) => string;
     successMessage: (args: { orchestrator: EscrowOrchestratorService; escrow: any; currency: any }) => string;
};

const ESCROW_META: Record<EscrowTxType, EscrowTxMeta> = {
     createEscrow: {
          validationRule: ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, escrow, currency, account, txOptions, orchestrator }) => ({
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
               createEscrow: {
                    amount: escrow.amount,
                    destination: escrow.destination,
                    finishAfter: escrow.escrowFinishAfterExpirationDate ? orchestrator.utilsService.toRippleTime(escrow.escrowFinishAfterExpirationDate) : '',
                    cancelAfter: escrow.escrowCancelAfterExpirationDate ? orchestrator.utilsService.toRippleTime(escrow.escrowCancelAfterExpirationDate) : '',
                    issuer: currency.issuer,
                    currencyValue: currency.currencyValue,
                    condition: escrow.condition,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, escrow, currency }) => orchestrator.escrowTransactionBuilderService.buildCreateEscrowTx(env.wallet || wallet, env, escrow, currency),
          simulationToastMessage: ({ orchestrator, escrow, currency }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               return `Successfully Sent Escrow of ${escrow.amount} ${code}${shortDest ? ` to ${shortDest}` : ''}`;
          },
     },

     finishEscrow: {
          validationRule: ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.FINISH],
          buildValidationInputs: ({ wallet, env, escrow, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    fee: env.fee,
                    currentLedger: env.currentLedger,
               },
               regularKey: {
                    isRegularKey: escrow.isRegularKeyAddress,
                    address: escrow.regularKeyAddress,
                    seed: escrow.regularKeySeed,
               },
               finishEscrow: {
                    escrowOwner: escrow.escrowOwnerField,
                    escrowSequenceNumber: escrow.escrowSequenceNumber,
                    condition: escrow.condition,
                    fulfillment: escrow.fulfillment,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, escrow, currency }) => orchestrator.escrowTransactionBuilderService.buildFinishEscrowTx(env.wallet || wallet, env, escrow),
          simulationToastMessage: ({ orchestrator, escrow, currency }) => `Simulated Finishing Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               return `Successfully Finished Escrow of ${escrow.amount} ${code}`;
          },
     },

     cancelEscrow: {
          validationRule: ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.CANCEL],
          buildValidationInputs: ({ wallet, env, escrow, account, txOptions }) => ({
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
               cancelEscrow: {
                    escrowSequenceNumber: escrow.escrowSequenceNumber,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, escrow }) => orchestrator.escrowTransactionBuilderService.buildCancelEscrowTx(env.wallet, env, escrow),
          simulationToastMessage: () => `Simulated Cancelling Escrow`,
          successMessage: () => `Successfully Cancelled Escrow`,
     },
};

@Injectable({ providedIn: 'root' })
export class EscrowOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowTransactionBuilderService = inject(EscrowTransactionBuilderService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeEscrowTx(type: EscrowTxType, config: EscrowConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { escrow, account, txOptions, trustline, currency, preFetchedEnv, wallet } = config;
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
                         includeChecks: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = ESCROW_META[type];

               const validationInputs = meta.buildValidationInputs({ orchestrator: this, wallet, env, escrow, account, currency, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, escrow, currency, trustline });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.escrow, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance;
               if (currency?.currency !== 'XRP') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkTokenBalance(env);
               } else {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, config?.escrow!.amount ? config.escrow.amount : '0');
               }
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
                    return this.handleSimulationSuccess(type, escrow, currency, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, escrow, currency });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeEscrowTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: EscrowTxType, escrow: any, currency: any, hash?: string) {
          const msg = ESCROW_META[type].simulationToastMessage({ orchestrator: this, escrow, currency });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
