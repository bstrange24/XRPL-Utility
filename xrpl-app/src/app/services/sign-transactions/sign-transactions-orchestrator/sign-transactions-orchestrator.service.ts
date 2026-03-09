import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';

interface SignTransactionsConfig {
     wallet: Wallet;
     formValues: {
          amountField: string; // must be present
          destinationAddress: string;
          destinationTagField?: any;
          invoiceIdField?: any;
          sourceTagField?: any;
          txType?: string;
          isSimulateEnabled?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string;
          [key: string]: any;
     };
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          wallet?: any;
     };
     extra?: Record<string, any>;
}

@Injectable({
     providedIn: 'root',
})
export class SignTransactionsOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnv = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);

     async executeSignTransaction(config: SignTransactionsConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false, useMultiSign = false } = formValues;

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
                    const envData = await this.txEnv.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    env = envData;
                    client = envData.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               const validationInputs = {
                    wallet,
                    network: {
                         accountInfo: env.accountInfo,
                         accountObjects: env.accountObjects,
                         fee: env.fee,
                         currentLedger: env.currentLedger,
                    },
                    paymentXrp: {
                         amount: formValues.amountField,
                         destination: formValues.destinationAddress,
                         destinationTagField: formValues.destinationTagField,
                         sourceTagField: formValues.sourceTagField,
                         invoiceIdField: formValues.invoiceIdField,
                    },
                    regularKey: {
                         isRegularKey: formValues.isRegularKeyAddress,
                         address: formValues.regularKeyAddress,
                         seed: formValues.regularKeySeed,
                    },
               };

               const errors = await this.validator.validate('PaymentXrp', {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               const paymentTx: xrpl.Payment = this.xrplTransactionService.buildSendXrpTransaction(env.wallet, formValues.destinationAddress, Number(formValues.amountField), env.fee, env.currentLedger);

               await this.applyOptionalFields(client, paymentTx, wallet, env.accountInfo, formValues);

               // 5. Execute
               const execResult = await this.executor.sendXrpPayment(paymentTx, env.wallet, client, {
                    useMultiSign: useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    const shortDest = formValues.destinationAddress.slice(0, 7) + '…' + formValues.destinationAddress.slice(-7);
                    this.txUiService.resetCurrentStepToIdle();
                    this.toast.success(`Simulated Sending ${formValues.amountField} XRP to ${shortDest}`, AppConstants.TOAST.SUCCESS, false, txHash, this.txUiService.explorerUrl() + 'tx/');
                    return { success: true, hash: txHash };
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, paymentTx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const shortDest = formValues.destinationAddress.slice(0, 7) + '…' + formValues.destinationAddress.slice(-7);
               this.xrplTransactionService.processTxFinalResult(finalResult, `Successfully Sent ${formValues.amountField} XRP to ${shortDest}`, { success: true, hash: txHash });
               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during XRP payment';
               console.error('[XrpPayment] execute failed:', err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Payment, wallet: Wallet, accountInfo: any, formValues: any) {
          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          // Tags, Memo, InvoiceID, DomainID, CredentialIDs
          const destinationTag = this.txUiService.destinationTagField();
          if (destinationTag) this.utilsService.setDestinationTag(tx, destinationTag);

          const sourceTag = this.txUiService.sourceTagField();
          if (sourceTag) this.utilsService.setSourceTagField(tx, sourceTag);

          const memo = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memo) this.utilsService.setMemoField(tx, memo);

          const invoiceId = this.txUiService.invoiceIdField();
          if (invoiceId) this.utilsService.setInvoiceIdField(tx, invoiceId);

          const domainId = this.txUiService.domainId();
          if (domainId) this.utilsService.setDomainId(tx, domainId);

          // Credential IDs (array)
          if (this.txUiService.credentialIDs()?.length > 0) {
               const jsonArray: string[] = formValues.credentialIDs
                    .split(',')
                    .map((id: string) => id.trim())
                    .filter((id: string | any[]) => id.length > 0);
               this.txUiService.credentialIDs.set(jsonArray);
               this.utilsService.setCredentialIDsField(tx, this.txUiService.credentialIDs());
          }
     }
}
