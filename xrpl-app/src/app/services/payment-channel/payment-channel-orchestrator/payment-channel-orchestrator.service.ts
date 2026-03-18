import { inject, Injectable } from '@angular/core';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

type PaymentChannelTxType = 'create' | 'fund' | 'claim' | 'renew' | 'close';

interface PaymentChannelConfig {
     wallet: Wallet;
     formValues: {
          amount?: string;
          destinationAddress?: string;
          settleDelay?: string;
          currencyValue?: string;
          channelIDField?: string;
          channelClaimSignatureField?: string;
          isSimulate?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string | string[];
          [key: string]: any;
     };
     extra?: Record<string, any>;
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          destinationAccountInfo?: any;
          wallet?: any;
     };
}

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);

     async executePaymentChannelTx(type: PaymentChannelTxType, config: PaymentChannelConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulate = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Pre-fetched environment missing required fields');
                    }
               } else {
                    const flags: any = {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includePaymentChannelObjects: true,
                    };

                    if (type === 'create') {
                         flags.includeDestinationAccountInfo = true;
                         flags.destinationAddress = formValues.destinationAddress;
                    }

                    env = await this.txEnvironmentService.prepareTxEnvironment(flags);
                    client = env.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               const validationRule = this.getValidationRuleName(type);
               const validationInputs = this.buildValidationInputs(type, wallet, env, formValues);
               const errors = await this.validator.validate(validationRule, {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               let currentLedgerTime;
               if (type === 'create') {
                    currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
               }
               const tx = this.buildPaymentChannelTransaction(type, env.wallet, env, formValues, currentLedgerTime);

               await this.applyOptionalFields(client, tx, wallet, formValues);

               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulate) {
                    return this.handleSimulationSuccess(type, formValues, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.paymentChannelUtilService.buildSuccessMessage(type, formValues);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });
               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during payment channel transaction';
               console.error(`[${type}] executePaymentChannelTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getValidationRuleName(type: PaymentChannelTxType): string {
          const map: Record<PaymentChannelTxType, string> = {
               create: 'PaymentChannelCreate',
               fund: 'PaymentChannelFund',
               claim: 'PaymentChannelClaim',
               renew: 'PaymentChannelRenew',
               close: 'PaymentChannelClose',
          };
          return map[type];
     }

     private buildValidationInputs(type: PaymentChannelTxType, wallet: Wallet, env: any, formValues: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'create') {
               return {
                    ...base,
                    paymentChannelCreate: {
                         amount: xrpl.xrpToDrops(formValues.amount ? formValues.amount : '0'),
                         destination: formValues.destinationAddress,
                         settleDelay: formValues.settleDelay,
                    },
               };
          }

          if (type === 'fund') {
               return {
                    ...base,
                    paymentChannelFund: {
                         amount: xrpl.xrpToDrops(formValues.amount ? formValues.amount : '0'),
                         channelIDField: formValues.channelIDField,
                    },
               };
          }

          if (type === 'claim') {
               return {
                    ...base,
                    paymentChannelClaim: {
                         amount: xrpl.xrpToDrops(formValues.amount ? formValues.amount : '0'),
                         channelIDField: formValues.channelIDField,
                         claimSignature: formValues.channelClaimSignatureField,
                    },
               };
          }

          if (type === 'renew') {
               return {
                    ...base,
                    paymentChannelRenew: {
                         channelIDField: formValues.channelIDField,
                    },
               };
          }

          return {
               ...base,
               paymentChannelClose: {
                    channelIDField: formValues.channelIDField,
               },
          };
     }
     private buildPaymentChannelTransaction(type: PaymentChannelTxType, wallet: xrpl.Wallet, env: any, formValues: any, currentLedgerTime: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'create') {
               let tx = this.xrplTransactionService.buildPaymentChannelCreateTransaction(wallet, fee, currentLedger, formValues);

               if (this.txUiService.paymentChannelCancelAfterTimeField()) {
                    const cancelAfterTime = this.utilsService.toRippleTime(this.txUiService.paymentChannelCancelAfterTimeField());
                    if (cancelAfterTime <= currentLedgerTime) {
                         throw new Error('Channel expiration time must be in the future');
                    }
                    this.utilsService.setCancelAfter(tx, cancelAfterTime);
               }
               return tx;
          }

          if (type === 'fund') {
               let tx = this.xrplTransactionService.buildPaymentChannelFundTransaction(wallet, fee, currentLedger, formValues);

               if (this.txUiService.paymentChannelCancelAfterTimeField()) {
                    const expireAfterTime = this.utilsService.toRippleTime(this.txUiService.paymentChannelCancelAfterTimeField());
                    if (expireAfterTime <= currentLedgerTime) {
                         throw new Error('Cancel After time must be in the future');
                    }
                    this.utilsService.setExpiration(tx, expireAfterTime);
               }
               return tx;
          }

          if (type === 'claim') {
               return this.xrplTransactionService.buildPaymentChannelClaimTransaction(wallet, fee, currentLedger, formValues);
          }

          if (type === 'renew') {
               return this.xrplTransactionService.buildPaymentChannelRenewTransaction(wallet, fee, currentLedger, formValues);
          }

          // close
          return this.xrplTransactionService.buildPaymentChannelCloseTransaction(wallet, fee, currentLedger, formValues.channelIDField);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, formValues: any) {
          if (formValues.isTicket) {
               // const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          if (formValues.isMemoEnabled && formValues.memo) this.utilsService.setMemoField(tx, formValues.memo);

          if (formValues.destinationTagField) {
               this.utilsService.setDestinationTag(tx, formValues.destinationTagField);
          }
     }

     private async executeSpecificTx(type: PaymentChannelTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          const opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'create') {
               return this.executor.paymentChannelCreate?.(tx as xrpl.PaymentChannelCreate, wallet, client, opts);
          }

          if (type === 'fund') {
               return this.executor.paymentChannelFundTx?.(tx as xrpl.PaymentChannelFund, wallet, client, opts);
          }

          // Claim, renew and close all use the PaymentChannelClaim object
          return this.executor.paymentChannelClaimTx?.(tx as xrpl.PaymentChannelClaim, wallet, client, opts);
     }

     private handleSimulationSuccess(type: PaymentChannelTxType, formValues: any, hash?: string) {
          let msg: string;

          if (type === 'create') {
               msg = `Simulated Creating Payment Channel of ${formValues.amount} ${formValues.currencyValue || 'XRP'} to ${formValues.destinationAddress?.slice(0, 7) + '…' + formValues.destinationAddress?.slice(-7)}`;
          } else if (type === 'fund') {
               msg = `Simulated Funding Payment Channel with Channel ID ${formValues.channelIDField}`;
          } else if (type === 'claim') {
               msg = `Simulated Claiming Payment Channel with Channel ID ${formValues.channelIDField}`;
          } else if (type === 'renew') {
               msg = `Simulated Renewing Payment Channel with Channel ID ${formValues.channelIDField}`;
          } else {
               msg = `Simulated Closing Payment Channel with Channel ID ${formValues.channelIDField}`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toast.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
