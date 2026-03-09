import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CredentialUtilService } from '../credential-util/credential-util.service';

export type CredentialTxType = 'createCredential' | 'deleteCredentials' | 'acceptCredentials';

interface CredentialConfig {
     wallet: Wallet;
     formValues: {
          amountField?: string;
          destinationAddress?: string;
          nfTokenMinterAddress?: string;
          setFlags?: any;
          clearFlags?: any;
          tickSize?: any;
          transferRate?: any;
          publicKey?: string;
          domain?: string;
          isMessageKey?: boolean;
          enableNftMinter?: string;
          isSimulateEnabled?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string | string[];
          suppressIndividualFeedback?: string;
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

@Injectable({
     providedIn: 'root',
})
export class CredentialTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialUtilService = inject(CredentialUtilService);

     async executeCredentialTx(type: CredentialTxType, config: CredentialConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
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
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    };

                    const env = await this.TxEnvironmentService.prepareTxEnvironment(envFlags);
                    client = env.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               const validationRule = this.getValidationRuleName(type);
               const validationInputs = this.buildValidationInputs(type, wallet, env, formValues, extra);
               const errors = await this.validator.validate(validationRule, {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• '), validationError: true };
               }

               const tx = this.buildModifyAccountTransaction(type, env.wallet, env, formValues, extra);

               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env, extra);

               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.credentialUtilService.handleSimulationSuccess(type, formValues, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.credentialUtilService.buildSuccessMessage(type, formValues, extra);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, {
                    success: true,
                    hash: txHash,
               });

               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during modify account transaction';
               console.error(`[${type}] executeModifyAccountTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getValidationRuleName(type: CredentialTxType): string {
          const map: Record<CredentialTxType, string> = {
               createCredential: 'CredentialCreate',
               deleteCredentials: 'CredentialDelete',
               acceptCredentials: 'CredentialAccept',
          };
          return map[type];
     }

     private buildValidationInputs(type: CredentialTxType, wallet: Wallet, env: any, formValues: any, extra?: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'createCredential') {
               return {
                    ...base,
                    createCredential: {
                         credentialType: extra.credentialType || '',
                         expirationRipple: extra.expirationRipple || '',
                         subject: extra.subject || '',
                    },
               };
          }

          if (type === 'deleteCredentials') {
               return {
                    ...base,
                    deleteCredentials: {
                         credentialType: extra.credentialType || '',
                         subject: extra.subject || '',
                         credentialID: formValues.credentialID,
                    },
               };
          }

          // acceptCredentials
          return {
               ...base,
               acceptCredentials: {
                    credentialType: formValues.credentialType || '',
                    Issuer: formValues.credentialIssuer || '',
               },
          };
     }

     private buildModifyAccountTransaction(type: CredentialTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'createCredential') {
               const tx = this.xrplTransactionService.buildCreateCredentialTransaction(wallet, extra.subject, extra.credentialType, fee, currentLedger);
               if (extra.expirationRipple) {
                    tx.Expiration = extra.expirationRipple;
               }

               return tx;
          }

          if (type === 'deleteCredentials') {
               const tx = this.xrplTransactionService.buildDeleteCredentialTransaction(wallet, extra.subject, extra.credentialType, fee, currentLedger);
               if (formValues.credentialIssuer) {
                    tx.Issuer = formValues.credentialIssuer;
               }
               return tx;
          }

          // acceptCredentials;
          return this.xrplTransactionService.buildAcceptCredentialTransaction(wallet, formValues.credentialIssuer, formValues.credentialType, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: CredentialTxType, formValues: any, env: any, extra: any) {
          if (type === 'createCredential') {
               if (extra.uri) this.utilsService.setURI(tx, extra.uri);
          }

          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          const memo = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memo) this.utilsService.setMemoField(tx, memo);
     }

     private async executeSpecificTx(type: CredentialTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          let opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'createCredential') {
               return this.executor.createCredential?.(tx as xrpl.CredentialCreate, wallet, client, opts);
          }

          if (type === 'deleteCredentials') {
               return this.executor.deleteCredential?.(tx as xrpl.CredentialDelete, wallet, client, opts);
          }

          // acceptCredentials
          return this.executor.acceptCredential?.(tx as xrpl.CredentialAccept, wallet, client, opts);
     }
}
