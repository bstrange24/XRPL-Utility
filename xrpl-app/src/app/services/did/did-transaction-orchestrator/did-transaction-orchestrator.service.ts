import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { DidUtilService } from '../did-util/did-util.service';
import didSchema from '../../../components/did/did-schema.json';
import { DidStoreService } from '../did-store/did-store.service';
import { DID_VALIDATION_RULES, DidTxConfig, DidTxType } from '../../../components/did/constants/did.constants';

@Injectable({ providedIn: 'root' })
export class DidTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didStoreService = inject(DidStoreService);

     async executeDidTx(type: DidTxType, config: DidTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          console.log('config: ', config);
          const { wallet, simulate = false, multiSign = false, didData, uriData, didDocumentData, preFetchedEnv, extra = {} } = config;

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
                    env = await this.TxEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                    });
               }

               console.log('env: ', env);
               client = env.client;

               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               // Validation
               // const validationRule = this.getValidationRuleName(type);
               const validationRule = DID_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    multiSign,
                    didData,
                    uriData,
                    didDocumentData,
                    extra,
               });

               const errors = await this.validator.validate(validationRule, {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• '), validationError: true };
               }

               // Build transaction
               const tx = this.buildDidTransaction(type, env.wallet || wallet, env, config, { simulate, multiSign, didData, uriData, didDocumentData, extra });

               // Optional fields
               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, { simulate, multiSign, didData, uriData, didDocumentData, extra }, env);

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, { simulate, multiSign, didData, uriData, didDocumentData, extra });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.didUtilService.handleSimulationSuccess(type, { simulate, multiSign, didData, uriData, didDocumentData, extra }, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.didUtilService.buildSuccessMessage(type, { simulate, multiSign, didData, uriData, didDocumentData, extra }, extra);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeDidTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
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

     private buildValidationInputs(type: DidTxType, wallet: Wallet, env: any, values: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: values.isRegularKeyAddress,
                    address: values.regularKeyAddress,
                    seed: values.regularKeySeed,
               },
          };

          switch (type) {
               case 'setDid':
                    return { ...base, did: { didDocument: values.didDocumentData, didUri: values.uriData, didData: values.didData } };
               case 'deleteDid':
                    return { ...base };
          }
     }

     private buildDidTransaction(type: DidTxType, wallet: xrpl.Wallet, env: any, config: any, values: any): xrpl.Transaction {
          const { fee } = env;

          switch (type) {
               case 'setDid':
                    const txSetDid = this.xrplTransactionService.buildSetDidTransaction(wallet, fee, env.ledgerInfo.lastIndex);
                    if (this.didStoreService.get('didDocumentData')) txSetDid.DIDDocument = this.utilsService.jsonToHex(this.didStoreService.get('didDocumentData'));
                    if (this.didStoreService.get('uriData')) txSetDid.URI = this.utilsService.jsonToHex(this.didStoreService.get('uriData'));
                    if (this.didStoreService.get('didData')) {
                         const result = this.utilsService.validateAndConvertDidJson(this.didStoreService.get('didData'), didSchema);
                         if (!result.success) throw new Error(result.errors ?? 'Invalid DID data');
                         txSetDid.Data = result.hexData;
                    }
                    return txSetDid;
               case 'deleteDid':
                    const txDeleteDid = this.xrplTransactionService.buildDeleteDidTransaction(wallet, fee, env.ledgerInfo.lastIndex);
                    return txDeleteDid;
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: DidTxType, values: any, env: any) {
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

     private async executeSpecificTx(type: DidTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, values: any) {
          const opts = {
               useMultiSign: values.multiSign,
               isRegularKeyAddress: values.isRegularKeyAddress,
               regularKeyAddress: values.regularKeyAddress,
               regularKeySeed: values.regularKeySeed,
               multiSignAddress: values.multiSignAddress,
               multiSignSeeds: values.multiSignSeeds,
          };

          switch (type) {
               case 'setDid':
                    return this.executor.setDid?.(tx as xrpl.DIDSet, wallet, client, opts);
               case 'deleteDid':
                    return this.executor.deleteDid?.(tx as xrpl.DIDDelete, wallet, client, opts);
          }
     }
}
