import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { PaymentChannelTransactionBuilderService } from '../payment-channel-transaction-builder/payment-channel-transaction-builder.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import { PAYMENT_CHANNEL, PAYMENT_CHANNEL_VALIDATION_RULES, PaymentChannelTxType } from '../../../components/payment-channel/constants/payment-channel.constants';
import { PaymentChannelTxConfig } from '../../../components/payment-channel/constants/payment-channel.types';
import { AppConstants } from '../../../core/app.constants';

type PaymentChannelTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; paymentChannel: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: PaymentChannelOrchestratorService; env: any; wallet: any; paymentChannel: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: PaymentChannelOrchestratorService; paymentChannel: any }) => string;
     successMessage: (args: { orchestrator: PaymentChannelOrchestratorService; paymentChannel: any }) => string;
};

const PAYMENT_CHANNEL_META: Record<PaymentChannelTxType, PaymentChannelTxMeta> = {
     createPaymentChannel: {
          validationRule: PAYMENT_CHANNEL_VALIDATION_RULES[PAYMENT_CHANNEL.CREATE],
          buildValidationInputs: ({ wallet, env, paymentChannel, account, txOptions }) => ({
               wallet,
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               paymentChannelCreate: {
                    amount: paymentChannel.amount,
                    destination: paymentChannel.destination,
                    settleDelay: paymentChannel.settleDelay,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, paymentChannel }) => orchestrator.paymentChannelTransactionBuilderService.buildCreatePaymentChannelTx(env.wallet || wallet, env, paymentChannel),
          simulationToastMessage: () => `Simulated Creating Payment Channel`,
          successMessage: () => `Payment Channel created successfully`,
     },

     fundPaymentChannel: {
          validationRule: PAYMENT_CHANNEL_VALIDATION_RULES[PAYMENT_CHANNEL.FUND],
          buildValidationInputs: ({ wallet, env, paymentChannel, account, txOptions }) => ({
               wallet,
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               paymentChannelFund: {
                    amount: paymentChannel.amount,
                    channelIDField: paymentChannel.channelIDField,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, paymentChannel }) => orchestrator.paymentChannelTransactionBuilderService.buildFundPaymentChannelTx(env.wallet || wallet, env, paymentChannel),
          simulationToastMessage: () => `Simulated Funding Payment Channel`,
          successMessage: () => `Payment Channel funded successfully`,
     },

     claimPaymentChannel: {
          validationRule: PAYMENT_CHANNEL_VALIDATION_RULES[PAYMENT_CHANNEL.CLAIM],
          buildValidationInputs: ({ wallet, env, paymentChannel, account, txOptions }) => ({
               wallet,
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               paymentChannelClaim: {
                    amount: paymentChannel.amount,
                    channelIDField: paymentChannel.channelIDField,
                    claimSignature: paymentChannel.channelClaimSignatureField,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, paymentChannel }) => orchestrator.paymentChannelTransactionBuilderService.buildClaimPaymentChannelTx(env.wallet || wallet, env, paymentChannel),
          simulationToastMessage: () => `Simulated Claiming Payment Channel`,
          successMessage: () => `Payment Channel claim successfully`,
     },

     renewPaymentChannel: {
          validationRule: PAYMENT_CHANNEL_VALIDATION_RULES[PAYMENT_CHANNEL.RENEW],
          buildValidationInputs: ({ wallet, env, paymentChannel, account, txOptions }) => ({
               wallet,
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               paymentChannelRenew: {
                    channelIDField: paymentChannel.channelIDField,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, paymentChannel }) => orchestrator.paymentChannelTransactionBuilderService.buildRenewPaymentChannelTx(env.wallet || wallet, env, paymentChannel),
          simulationToastMessage: () => `Simulated Renewing Payment Channel`,
          successMessage: () => `Payment Channel renew successfully`,
     },

     closePaymentChannel: {
          validationRule: PAYMENT_CHANNEL_VALIDATION_RULES[PAYMENT_CHANNEL.CLOSE],
          buildValidationInputs: ({ wallet, env, paymentChannel, account, txOptions }) => ({
               wallet,
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               paymentChannelClose: {
                    channelIDField: paymentChannel.channelIDField,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, paymentChannel }) => orchestrator.paymentChannelTransactionBuilderService.buildClosePaymentChannelTx(env.wallet || wallet, env, paymentChannel),
          simulationToastMessage: () => `Simulated Closing Payment Channel`,
          successMessage: () => `Closed Payment Channel successfully`,
     },
};

@Injectable({ providedIn: 'root' })
export class PaymentChannelOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly paymentChannelTransactionBuilderService = inject(PaymentChannelTransactionBuilderService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly toastService = inject(ToastService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executePaymentChannelTx(type: PaymentChannelTxType, config: PaymentChannelTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { paymentChannel, account, txOptions, preFetchedEnv, wallet } = config;
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
                         includePaymentChannelObjects: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = PAYMENT_CHANNEL_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, paymentChannel, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, paymentChannel });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.paymentChannel, type, txOptions);

               // Balance check
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
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
                    return this.handleSimulationSuccess(type, paymentChannel, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, paymentChannel });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executePaymentChannelTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: PaymentChannelTxType, paymentChannel: any, hash?: string) {
          const msg = PAYMENT_CHANNEL_META[type].simulationToastMessage({ orchestrator: this, paymentChannel });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
