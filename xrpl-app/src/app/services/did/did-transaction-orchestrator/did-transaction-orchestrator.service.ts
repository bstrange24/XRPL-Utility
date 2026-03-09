import { inject, Injectable } from '@angular/core';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { DidUtilService } from '../did-util/did-util.service';
import didSchema from '../../../components/did/did-schema.json';

export type DidTxType = 'setDid' | 'deleteDid';

interface DidConfig {
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
export class DidTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly didUtilService = inject(DidUtilService);

     async executeDidTx(type: DidTxType, config: DidConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // 1. Use pre-fetched env if available, otherwise fetch
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

               // 2. Validation
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

               // 3. Build transaction
               const tx = this.buildModifyAccountTransaction(type, env.wallet, env, formValues, extra);

               // 4. Apply optional fields
               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env, extra);

               // 5. Execute transaction
               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.didUtilService.handleSimulationSuccess(type, formValues, txHash, extra);
               }

               // 6. Wait for final outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.didUtilService.buildSuccessMessage(type, formValues, extra);
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

     private getValidationRuleName(type: DidTxType): string {
          const map: Record<DidTxType, string> = {
               setDid: 'DIDSet',
               deleteDid: 'DIDdelete',
          };
          return map[type];
     }

     private buildValidationInputs(type: DidTxType, wallet: Wallet, env: any, formValues: any, extra?: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'setDid') {
               return {
                    ...base,
                    did: {
                         document: this.txUiService.didDetails().document || '',
                         uri: this.txUiService.didDetails().uri || '',
                         data: this.txUiService.didDetails().data || '',
                    },
               };
          }

          // deleteDid
          return {
               ...base,
          };
     }

     private buildModifyAccountTransaction(type: DidTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'setDid') {
               const tx = this.xrplTransactionService.buildSetDidTransaction(wallet, fee, currentLedger);
               if (this.txUiService.didDetails().document) {
                    const hex = this.utilsService.jsonToHex({ didData: this.txUiService.didDetails().document });
                    tx.DIDDocument = hex;
               }
               if (this.txUiService.didDetails().uri) {
                    const hex = this.utilsService.jsonToHex({ uri: this.txUiService.didDetails().uri });
                    tx.URI = hex;
               }
               if (this.txUiService.didDetails().data) {
                    const result = this.utilsService.validateAndConvertDidJson(this.txUiService.didDetails().data, didSchema);
                    if (!result.success) throw new Error(result.errors ?? 'Invalid DID data');
                    tx.Data = result.hexData;
               }
               return tx;
          }

          // deleteDid;
          return this.xrplTransactionService.buildDeleteDidTransaction(wallet, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: DidTxType, formValues: any, env: any, extra: any) {
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

     private async executeSpecificTx(type: DidTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          let opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'setDid') {
               return this.executor.setDid?.(tx as xrpl.DIDSet, wallet, client, opts);
          }

          // deleteDid
          return this.executor.deleteDid?.(tx as xrpl.DIDDelete, wallet, client, opts);
     }
}
