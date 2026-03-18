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
import { EscrowUtilService } from '../escrow-util/escrow-util.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

type EscrowTxType = 'create' | 'finish' | 'cancel';

interface EscrowConfig {
     wallet: Wallet;
     formValues: {
          amountField?: string;
          destinationAddress?: string;
          escrowFinishTimeField?: any;
          escrowCancelTimeField?: any;
          currencyValue?: string;
          issuer?: string;
          escrowSequenceNumberField?: string;
          escrowOwnerField?: string;
          condition?: string;
          fulfillment?: string;
          isConditional?: boolean;
          isSimulateEnabled?: boolean;
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
          escrowObjects?: any;
          escrowObjectsBySequenceId?: any;
          wallet?: any;
     };
}

@Injectable({ providedIn: 'root' })
export class TimeBasedEscrowOrchestrator extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     async executeEscrowTx(type: EscrowTxType, config: EscrowConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

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
                    // Normal fetch fallback
                    const envFlags: any = {
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    };

                    if (type === 'create') {
                         envFlags.includeAccountObject = true;
                         envFlags.includeDestinationAccountInfo = true;
                         envFlags.destinationAddress = formValues.destinationAddress;
                    } else if (type === 'finish') {
                         envFlags.includeEscrowBySequenceId = true;
                         envFlags.escrowSequenceNumberField = formValues.escrowSequenceNumberField;
                    } else if (type === 'cancel') {
                         envFlags.includeEscrows = true;
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment(envFlags);
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

               const tx = this.buildEscrowTransaction(type, env.wallet, env, formValues, extra);

               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues);

               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.escrowUtilService.handleSimulationSuccess(type, formValues, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.escrowUtilService.buildSuccessMessage(type, formValues);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, {
                    success: true,
                    hash: txHash,
               });

               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during time-based escrow transaction';
               console.error(`[${type}] executeEscrowTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getValidationRuleName(type: EscrowTxType): string {
          const map: Record<EscrowTxType, string> = {
               create: 'CreateTimeBasedEscrow',
               finish: 'FinishTimeBasedEscrow',
               cancel: 'CancelTimeBasedEscrow',
          };
          return map[type];
     }

     private buildValidationInputs(type: EscrowTxType, wallet: Wallet, env: any, formValues: any) {
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
                    createTimeBasedEscrow: {
                         amount: formValues.amountField,
                         destination: formValues.destinationAddress,
                         finishAfter: this.utilsService.toRippleTime(formValues.escrowFinishTimeField),
                         cancelAfter: this.utilsService.toRippleTime(formValues.escrowCancelTimeField),
                         issuer: formValues.issuer,
                         currencyValue: formValues.currencyValue,
                         condition: formValues.condition,
                    },
               };
          }

          if (type === 'finish') {
               return {
                    ...base,
                    finishTimeBasedEscrow: {
                         escrowOwner: formValues.escrowOwnerField,
                         escrowSequenceNumberField: formValues.escrowSequenceNumberField,
                         condition: formValues.condition,
                         fulfillment: formValues.fulfillment,
                    },
               };
          }

          return {
               ...base,
               cancelTimeBasedEscrow: {
                    escrowSequenceNumberField: formValues.escrowSequenceNumberField,
               },
          };
     }

     private buildEscrowTransaction(type: EscrowTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'create') {
               let amountToCash;
               if (formValues.currencyValue === 'MPT') {
                    amountToCash = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyValue, formValues.currencyIssuer ?? '', '', true).sendMax;
               } else {
                    amountToCash = this.xrplTransactionService.buildAmount(formValues.currencyValue, formValues.amountField, formValues.issuer);
               }

               const tx = this.xrplTransactionService.buildCreateTimeBasedEscrowTransaction(wallet, amountToCash, formValues.destinationAddress, fee, currentLedger);

               if (formValues.condition) {
                    tx.Condition = formValues.condition;
               }

               if (this.txUiService.enableEscrowFinishAfterExpirationDate()) {
                    tx.FinishAfter = formValues.escrowFinishTimeField ? this.utilsService.toRippleTime(formValues.escrowFinishTimeField) : 0;
               }

               if (this.txUiService.enableEscrowCancelAfterExpirationDate()) {
                    tx.CancelAfter = formValues.escrowCancelTimeField ? this.utilsService.toRippleTime(formValues.escrowCancelTimeField) : 0;
               }

               return tx;
          }

          if (type === 'finish') {
               const tx = this.xrplTransactionService.buildFinishTimeBasedEscrowTransaction(wallet, fee, currentLedger, formValues.escrowOwnerField, Number.parseInt(formValues.escrowSequenceNumberField));
               if (formValues.fulfillment) tx.Fulfillment = formValues.fulfillment;
               if (formValues.condition) tx.Condition = formValues.condition;
               return tx;
          }

          // cancel
          return this.xrplTransactionService.buildCancelTimeBasedEscrowTransaction(wallet, formValues.escrowOwnerField || wallet.classicAddress, fee, currentLedger, Number.parseInt(formValues.escrowSequenceNumberField));
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: EscrowTxType, formValues: any) {
          const isTicket = formValues.isTicket;
          if (isTicket) {
               // const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          const memo = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memo) this.utilsService.setMemoField(tx, memo);

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(tx, this.txUiService.destinationTagField());
          }

          this.utilsService.setTxAmount(type, formValues, tx);

          if (type === 'create' && formValues.condition && formValues.fulfillment) {
               tx.Condition = formValues.condition;
          }

          if (type === 'finish' && formValues.condition && formValues.fulfillment) {
               tx.Condition = formValues.condition;
               tx.Fulfillment = formValues.fulfillment;
          }
     }

     private async executeSpecificTx(type: EscrowTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          const opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'create') {
               return this.executor.createEscrow?.(tx as xrpl.EscrowCreate, wallet, client, opts);
          }

          if (type === 'finish') {
               return this.executor.finishEscrow?.(tx as xrpl.EscrowFinish, wallet, client, opts);
          }

          return this.executor.cancelEscrow?.(tx as xrpl.EscrowCancel, wallet, client, opts);
     }

     // private handleSimulationSuccess(type: EscrowTxType, formValues: any, hash?: string) {
     //      let msg: string;

     //      if (type === 'create') {
     //           msg = `Simulated Creating Time Based Escrow of ${formValues.amountField} ${formValues.currencyValue || 'XRP'} to ${formValues.destinationAddress?.slice(0, 7) + '…' + formValues.destinationAddress?.slice(-7)}`;
     //      } else if (type === 'finish') {
     //           msg = `Simulated Finishing Time Based Escrow with Sequence ID ${formValues.escrowSequenceNumberField}`;
     //      } else {
     //           msg = `Simulated Cancelling Time Based Escrow with Sequence ID ${formValues.escrowSequenceNumberField}`;
     //      }

     //      this.txUiService.resetCurrentStepToIdle();
     //      this.toast.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

     //      return { success: true, hash };
     // }
}
