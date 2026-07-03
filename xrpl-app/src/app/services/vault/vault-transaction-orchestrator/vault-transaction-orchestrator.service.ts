import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { VaultConfig, VaultTxType } from '../../../components/vault/constants/vault.types';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { EscrowTransactionBuilderService } from '../../escrow/escrow-transaction-builder/escrow-transaction-builder.service';
import { EscrowUtilService } from '../../escrow/escrow-util/escrow-util.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { AppConstants } from '../../../core/app.constants';
import { VaultTransactionBuilderService } from '../vault-transaction-builder/vault-transaction-builder.service';

type VaultTxMeta = {
     buildTx: (args: { orchestrator: VaultTransactionOrchestratorService; client: xrpl.Client; env: any; wallet: any; escrow: any; currency: any; trustline: any; vault: any; mpt: any }) => xrpl.Transaction | Promise<xrpl.Transaction>;
     simulationToastMessage: (args: { orchestrator: VaultTransactionOrchestratorService; escrow: any; currency: any; vault: any }) => string;
     successMessage: (args: { orchestrator: VaultTransactionOrchestratorService; escrow: any; currency: any; vault: any }) => string;
};

const VAULT_META: Record<VaultTxType, VaultTxMeta> = {
     createVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault, mpt }) => orchestrator.vaultTransactionBuilderService.buildCreateVaultTx(env.wallet || wallet, env, escrow, currency, vault, mpt),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Created Vault`;
          },
     },

     modifyVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault, mpt }) => orchestrator.vaultTransactionBuilderService.buildModifyVaultTx(env.wallet || wallet, env, escrow, currency, vault, mpt),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Modified Vault`;
          },
     },
     depositVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault, mpt }) => orchestrator.vaultTransactionBuilderService.buildVaultDepositTx(env.wallet || wallet, client, env, vault),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Deposited Asset in Vault`;
          },
     },
     withdrawlVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault, mpt }) => orchestrator.vaultTransactionBuilderService.buildVaultWithdrawTx(env.wallet || wallet, client, env, vault),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Withdrawl from the Vault`;
          },
     },
     clawbackVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault, mpt }) => orchestrator.vaultTransactionBuilderService.buildClawbackVaultTx(env.wallet || wallet, client, env, escrow, currency, vault, mpt),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Sending Escrow of ${escrow.amount} ${orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP'}`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Clawback to the Vault`;
          },
     },
     deleteVault: {
          buildTx: ({ orchestrator, client, env, wallet, escrow, currency, vault }) => orchestrator.vaultTransactionBuilderService.buildDeleteVaultTx(env.wallet || wallet, env, vault),
          simulationToastMessage: ({ orchestrator, escrow, currency, vault }) => `Simulated Deleting Vault`,
          successMessage: ({ orchestrator, escrow, currency, vault }) => {
               const code = orchestrator.utilsService.encodeIfNeeded(currency.currencyCode) || 'XRP';
               const dest = escrow.destination;
               const shortDest = dest ? `${dest.slice(0, 7)}…${dest.slice(-7)}` : '';
               const destSuffix = shortDest ? ` to ${shortDest}` : '';
               return `Successfully Deletion of the Vault`;
          },
     },
};

@Injectable({
     providedIn: 'root',
})
export class VaultTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
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
     public readonly vaultTransactionBuilderService = inject(VaultTransactionBuilderService);

     async executeVaultTx(type: VaultTxType, config: VaultConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { vault, mpt, escrow, account, txOptions, trustline, currency, preFetchedEnv, wallet } = config;
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
                         includeDestinationAccountInfo: true,
                         includeTrustlines: true,
                         includeEscrows: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Build transaction
               const meta = VAULT_META[type];
               const tx = await meta.buildTx({ orchestrator: this, client, env, wallet, escrow, currency, trustline, vault, mpt });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.escrow, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance;
               if (currency?.currency !== 'XRP' && currency?.currency !== 'MPT') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkTokenBalance(env, tx);
               } else if (type === 'createVault') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, config?.escrow!.amount ? config.escrow.amount : '0');
               } else {
                    // If we are finishing or cancelling an escrow, we need to ensure the account has enough XRP to cover the fee,
                    // since the amount is not being sent from the account but the transaction still requires a fee to be paid.
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
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
                    return this.handleSimulationSuccess(type, escrow, currency, vault, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, escrow, currency, vault });
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

     handleSimulationSuccess(type: VaultTxType, escrow: any, currency: any, vault: any, hash?: string) {
          const msg = VAULT_META[type].simulationToastMessage({ orchestrator: this, escrow, currency, vault });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
