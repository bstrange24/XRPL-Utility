import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { AccountDeleteTxType, AccountDeleteConfig, ACCOUNT_DELETE_TX_TYPES } from '../../../components/delete-account/constants/delete-account.constants';
import { DeleteAccountUtilService } from '../delete-account-util/delete-account-util.service';
import { DeleteAccountStoreService } from '../delete-account-store/delete-account-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class DeleteAccountOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly deleteAccountUtilService = inject(DeleteAccountUtilService);
     public readonly deleteAccountStoreService = inject(DeleteAccountStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     async executeDeleteAccountTx(type: AccountDeleteTxType, config: AccountDeleteConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const { wallet, simulate = false, multiSign = false, destination, destinationTag, preFetchedEnv, extra = {} } = config;

          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               if (preFetchedEnv) {
                    env = preFetchedEnv;
               } else {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                    });
               }

               client = env.client;

               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               // Validation
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    multiSign,
                    destination,
                    destinationTag,
                    extra,
               });

               const errors = await this.validator.validate(ACCOUNT_DELETE_TX_TYPES, {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• '), validationError: true };
               }

               // Build transaction
               const tx = this.buildDeleteAccountTransaction(type, env.wallet || wallet, env, config, { simulate, multiSign, destination, destinationTag, extra });

               // Optional fields
               await this.applyOptionalFields(client, tx, wallet, type, { simulate, multiSign, destination, destinationTag, extra }, env);

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, { simulate, multiSign, destination, destinationTag, extra });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.deleteAccountUtilService.handleSimulationSuccess(type, { simulate, multiSign, destination, destinationTag, extra }, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.deleteAccountUtilService.buildSuccessMessage(type, { simulate, multiSign, destination, destinationTag, extra }, extra);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeDeleteAccountTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(type: AccountDeleteTxType, wallet: Wallet, env: any, values: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: values.isRegularKeyAddress,
                    address: values.regularKeyAddress,
                    seed: values.regularKeySeed,
               },
          };

          return { ...base, destination: { destination: values.destination } };
     }

     private buildDeleteAccountTransaction(type: AccountDeleteTxType, wallet: xrpl.Wallet, env: any, config: any, values: any): xrpl.Transaction {
          return this.xrplTransactionService.buildAccountDeleteTransaction(wallet, values.destination, env.accountInfo, env.ledgerInfo.lastIndex);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, type: AccountDeleteTxType, values: any, env: any) {
          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          const destinationTag = this.xrplTxOptionsStore.destinationTag();
          if (destinationTag) this.utilsService.setDestinationTag(tx, destinationTag);

          const sourceTag = this.xrplTxOptionsStore.sourceTag();
          if (sourceTag) this.utilsService.setSourceTagField(tx, sourceTag);

          const memo = this.xrplTxOptionsStore.memos();
          if (this.txUiService.isMemoEnabled() && memo) this.utilsService.addMemoField(tx, memo);

          const invoiceId = this.xrplTxOptionsStore.invoiceId();
          if (invoiceId) this.utilsService.setInvoiceIdField(tx, invoiceId);
     }

     private async executeSpecificTx(type: AccountDeleteTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, values: any) {
          const opts = {
               useMultiSign: values.multiSign,
               isRegularKeyAddress: values.isRegularKeyAddress,
               regularKeyAddress: values.regularKeyAddress,
               regularKeySeed: values.regularKeySeed,
               multiSignAddress: values.multiSignAddress,
               multiSignSeeds: values.multiSignSeeds,
          };

          return this.executor.accountDelete?.(tx as xrpl.AccountDelete, wallet, client, opts);
     }
}
