import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { SendXrpTransactionBuilderService } from '../send-xrp-transaction-builder/send-xrp-transaction-builder.service';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { SEND_XRP_TX_TYPES, SEND_XRP_VALIDATION_RULES, SendXrpTxType } from '../../../components/send-xrp/constants/send-xrp.constants';
import { XrpPaymentConfig } from '../../../components/send-xrp/constants/send-xrp.types';
import { AppConstants } from '../../../core/app.constants';

type SendXrpTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: SendXrpTransactionOrchestratorService; env: any; wallet: any; account: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: SendXrpTransactionOrchestratorService; account: any }) => string;
     successMessage: (args: { orchestrator: SendXrpTransactionOrchestratorService; account: any }) => string;
};

const SEND_XRP_META: Record<SendXrpTxType, SendXrpTxMeta> = {
     sendXrp: {
          validationRule: SEND_XRP_VALIDATION_RULES[SEND_XRP_TX_TYPES.SEND],
          buildValidationInputs: ({ wallet, env, account, txOptions }) => ({
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
               paymentXrp: {
                    amount: account.amount,
                    destination: account.destination,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, account }) => orchestrator.sendXrpTransactionBuilderService.buildSendXrpTransaction(env.wallet || wallet, env, account),
          simulationToastMessage: () => `Successfully simulated Sending XRP`,
          successMessage: () => `Successfully Sent XRP`,
     },
};

@Injectable({ providedIn: 'root' })
export class SendXrpTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly sendXrpTransactionBuilderService = inject(SendXrpTransactionBuilderService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly toastService = inject(ToastService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeXrpPayment(type: SendXrpTxType, config: XrpPaymentConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { account, txOptions, preFetchedEnv, wallet } = config;
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


               // ── 2. Validation ───────────────────────────────────────────
               const meta = SEND_XRP_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // ── 3. Build transaction ────────────────────────────────────
               const tx = meta.buildTx({ orchestrator: this, env, wallet, account });

               // ── 4. Optional fields ──────────────────────────────────────
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

               // ── 5. Balance check ────────────────────────────────────────
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // ── 6. Submit / simulate ────────────────────────────────────
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

               // ── 7. Simulation early return ──────────────────────────────
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(account, txHash);
               }

               // ── 8. Wait for final outcome ───────────────────────────────
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, account });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeXrpPayment failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(account: any, hash?: string) {
          const msg = SEND_XRP_META['sendXrp'].simulationToastMessage({ orchestrator: this, account });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
