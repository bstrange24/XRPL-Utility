import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';

export type PermissionDomainTxType = 'set' | 'delete';

interface PermissionDomainConfig {
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
export class PermissionedDomainOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly credentialStore = inject(CredentialStore);

     async executePermissionDomainTx(type: PermissionDomainTxType, config: PermissionDomainConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
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
                    return this.permissionedDomainUtilService.handleSimulationSuccess(type, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash || '', tx.LastLedgerSequence || 0);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.permissionedDomainUtilService.buildSuccessMessage(type);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });
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

     private getValidationRuleName(type: PermissionDomainTxType): string {
          const map: Record<PermissionDomainTxType, string> = {
               set: 'PermissionedDomainSet',
               delete: 'PermissionedDomainDelete',
          };
          return map[type];
     }

     private buildValidationInputs(type: PermissionDomainTxType, wallet: Wallet, env: any, formValues: any, extra?: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'set') {
               return {
                    ...base,
                    permissionedDomainSet: {
                         subject: formValues.subject,
                         credentialType: this.credentialStore.get('credentialType'),
                    },
               };
          }

          // delete
          return {
               ...base,
               permissonedDomainDelete: {
                    domainId: formValues.domainId,
               },
          };
     }

     private buildModifyAccountTransaction(type: PermissionDomainTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'set') {
               return this.xrplTransactionService.buildPermissionedDomainSetTransaction(wallet, formValues.subject, fee, currentLedger);
          }

          // delete;
          return this.xrplTransactionService.buildPermissionedDomainDeleteTransaction(wallet, formValues.domainId, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: PermissionDomainTxType, formValues: any, env: any, extra: any) {
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

     private async executeSpecificTx(type: PermissionDomainTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          let opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'set') {
               return this.executor.permissionedDomainSet?.(tx as xrpl.PermissionedDomainSet, wallet, client, opts);
          }

          // delete
          return this.executor.permissionedDomainDelete?.(tx as xrpl.PermissionedDomainDelete, wallet, client, opts);
     }
}
