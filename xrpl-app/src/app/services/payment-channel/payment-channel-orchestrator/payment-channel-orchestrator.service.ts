import { inject, Injectable } from '@angular/core';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { PaymentChannelTxConfig } from '../../../components/payment-channel/constants/payment-channel.types';
import { PaymentChannelTransactionBuilderService } from '../payment-channel-transaction-builder/payment-channel-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { PaymentChannelTxType, PAYMENT_CHANNEL_VALIDATION_RULES } from '../../../components/payment-channel/constants/payment-channel.constants';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly toast = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelTransactionBuilderService = inject(PaymentChannelTransactionBuilderService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeCredentialTx(type: PaymentChannelTxType, config: PaymentChannelTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
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
               const validationRule = PAYMENT_CHANNEL_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, paymentChannel, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               let tx: any;
               if (type === 'createPaymentChannel') {
                    tx = this.paymentChannelTransactionBuilderService.buildCreatePaymentChannelTx(env.wallet || wallet, env, paymentChannel);
               } else if (type === 'fundPaymentChannel') {
                    tx = this.paymentChannelTransactionBuilderService.buildFundPaymentChannelTx(env.wallet || wallet, env, paymentChannel);
               } else if (type === 'claimPaymentChannel') {
                    tx = this.paymentChannelTransactionBuilderService.buildClaimPaymentChannelTx(env.wallet || wallet, env, paymentChannel);
               } else if (type === 'renewPaymentChannel') {
                    tx = this.paymentChannelTransactionBuilderService.buildRenewPaymentChannelTx(env.wallet || wallet, env, paymentChannel);
               } else {
                    tx = this.paymentChannelTransactionBuilderService.buildClosePaymentChannelTx(env.wallet || wallet, env, paymentChannel);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.paymentChannel, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, account, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeCredentialTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(type: PaymentChannelTxType, wallet: Wallet, env: any, paymentChannel: any, account: any, txOptions: any) {
          const base = {
               wallet,
               // network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
          };

          switch (type) {
               case 'createPaymentChannel':
                    return { ...base, paymentChannelCreate: { amount: paymentChannel.amount, destination: paymentChannel.destination, settleDelay: paymentChannel.settleDelay } };
               case 'fundPaymentChannel':
                    return { ...base, paymentChannelFund: { amount: paymentChannel.amount, channelIDField: paymentChannel.channelIDField } };
               case 'claimPaymentChannel':
                    return { ...base, paymentChannelClaim: { amount: paymentChannel.amount, channelIDField: paymentChannel.channelIDField, claimSignature: paymentChannel.channelClaimSignatureField } };
               case 'renewPaymentChannel':
                    return { ...base, paymentChannelRenew: { channelIDField: paymentChannel.channelIDField } };
               case 'closePaymentChannel':
                    return { ...base, paymentChannelClose: { channelIDField: paymentChannel.channelIDField } };
          }
     }

     private async executeSpecificTx(type: PaymentChannelTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
          const opts = {
               useMultiSign: txOptions.useMultiSign,
               isRegularKeyAddress: txOptions.isRegularKeyAddress,
               isSimulateEnabled: txOptions.isSimulateEnabled,
               regularKeyAddress: account.regularKeyAddress,
               regularKeySeed: account.regularKeySeed,
               multiSignAddress: account.multiSignAddress,
               multiSignSeeds: account.multiSignSeeds,
          };

          switch (type) {
               case 'createPaymentChannel':
                    return this.executor.paymentChannelCreate?.(env, tx as xrpl.PaymentChannelCreate, wallet, client, opts);
               case 'fundPaymentChannel':
                    return this.executor.paymentChannelFundTx?.(env, tx as xrpl.PaymentChannelFund, wallet, client, opts);
               case 'claimPaymentChannel':
                    return this.executor.paymentChannelClaimTx?.(env, tx as xrpl.PaymentChannelClaim, wallet, client, opts);
               case 'renewPaymentChannel':
                    return this.executor.paymentChannelClaimTx?.(env, tx as xrpl.PaymentChannelClaim, wallet, client, opts);
               case 'closePaymentChannel':
                    return this.executor.paymentChannelClaimTx?.(env, tx as xrpl.PaymentChannelClaim, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: any): string {
          if (type === 'createPaymentChannel') return `Payment Channel created successfully`;
          if (type === 'fundPaymentChannel') return `Payment Channel funded successfully`;
          if (type === 'claimPaymentChannel') return `Payment Channel claim successfully`;
          if (type === 'renewPaymentChannel') return `Payment Channel renew successfully`;
          return `Closed Payment Channel successfully`;
     }

     handleSimulationSuccess(type: PaymentChannelTxType, hash?: string) {
          let msg: string;

          if (type === 'createPaymentChannel') {
               msg = `Simulated Creating Payment Channel`;
          } else if (type === 'fundPaymentChannel') {
               msg = `Simulated Funding Payment Channel`;
          } else if (type === 'claimPaymentChannel') {
               msg = `Simulated Claiming Payment Channel`;
          } else if (type === 'renewPaymentChannel') {
               msg = `Simulated Renewing Payment Channel`;
          } else {
               msg = `Simulated Closing Payment Channel`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toast.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
