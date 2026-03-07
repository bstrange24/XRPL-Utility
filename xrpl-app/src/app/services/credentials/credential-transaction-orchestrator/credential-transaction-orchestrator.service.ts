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

export type CredentialTxType = 'createCredential' | 'deleteCredentials';

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
               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env);

               // 5. Execute transaction
               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.credentialUtilService.handleSimulationSuccess(type, formValues, txHash, extra);
               }

               // 6. Wait for final outcome
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
               createCredential: 'CreateTimeBasedEscrow',
               deleteCredentials: '',
               // modifyDepositAuth: 'SetDepositAuthAccounts',
               // modifyMultiSigners: 'SetMultiSign',
               // modifyRegularKey: 'SetRegularKey',
               // modifyMetaData: 'SetNftMinterAddress',
               // updateMetaData: 'UpdateMetaData',
               // modifyAccountSetFlags: 'UpdateAccountFlags',
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

          // if (type === 'createCredential') {
          return {
               ...base,
               modifyAccountFlags: {
                    // if you later want to validate something about flags
                    setFlags: extra?.setFlags || [],
                    clearFlags: extra?.clearFlags || [],
               },
          };
          // }

          // if (type === 'modifyAccountFlags') {
          //      return {
          //           ...base,
          //           createTimeBasedEscrow: {
          //                amount: formValues.amountField,
          //                destination: formValues.destinationAddress,
          //                finishAfter: this.utilsService.toRippleTime(formValues.escrowFinishTimeField),
          //                cancelAfter: this.utilsService.toRippleTime(formValues.escrowCancelTimeField),
          //                issuer: formValues.issuer,
          //                currencyValue: formValues.currencyValue,
          //                condition: formValues.condition,
          //           },
          //      };
          // }

          // if (type === 'modifyDepositAuth') {
          //      return {
          //           ...base,
          //           modifyDepositAuth: {
          //                depsositAuthEntries: extra.depsositAuthEntries,
          //                authorizeFlag: extra.authorizeFlag,
          //           },
          //      };
          // }

          // if (type === 'modifyMultiSigners') {
          //      return {
          //           ...base,
          //           modifyMultiSigners: {
          //                formattedSignerEntries: extra.formattedSignerEntries,
          //                signerQuorum: formValues.signerQuorum,
          //           },
          //      };
          // }

          // if (type === 'modifyRegularKey') {
          //      return {
          //           ...base,
          //           modifyRegularKey: {
          //                regularKeyAddress: formValues.regularKeyAddress,
          //                regularKeySeed: formValues.regularKeySeed,
          //           },
          //      };
          // }

          // if (type === 'modifyMetaData') {
          //      return {
          //           ...base,
          //           modifyMetaData: {
          //                nfTokenMinterAddress: formValues.nfTokenMinterAddress,
          //           },
          //      };
          // }

          // // updateMetaData
          // return {
          //      ...base,
          //      updateMetaData: {
          //           tickSize: formValues.tickSize,
          //           transferRate: formValues.transferRate,
          //           userEmail: formValues.userEmail,
          //           domain: formValues.domain,
          //      },
          // };
     }

     private buildModifyAccountTransaction(type: CredentialTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any, depostiAuthAddress?: string): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'createCredential') {
               return this.xrplTransactionService.buildCreateCredentialTransaction(wallet, extra.credentialType, extra.expirationRipple, env.fee, env.currentLedger);
          }

          // if (type === 'modifyAccountFlags') {
          //      let amountToCash;
          //      if (formValues.currencyValue === 'MPT') {
          //           amountToCash = this.xrplTransactionService.buildSendMaxAmount(formValues.currencyValue, formValues.currencyIssuer ?? '', '', true).sendMax;
          //      } else {
          //           amountToCash = this.xrplTransactionService.buildAmount(formValues.currencyValue, formValues.amountField, formValues.issuer);
          //      }

          //      const tx = this.xrplTransactionService.buildCreateTimeBasedEscrowTransaction(wallet, amountToCash, formValues.destinationAddress, fee, currentLedger);

          //      if (formValues.condition) {
          //           tx.Condition = formValues.condition;
          //      }

          //      if (this.txUiService.enableEscrowFinishAfterExpirationDate()) {
          //           tx.FinishAfter = formValues.escrowFinishTimeField ? this.utilsService.toRippleTime(formValues.escrowFinishTimeField) : 0;
          //      }

          //      if (this.txUiService.enableEscrowCancelAfterExpirationDate()) {
          //           tx.CancelAfter = formValues.escrowCancelTimeField ? this.utilsService.toRippleTime(formValues.escrowCancelTimeField) : 0;
          //      }

          //      return tx;
          // }

          // if (type === 'modifyDepositAuth') {
          //      return this.xrplTransactionService.buildModifyDepositAuthTransaction(wallet, extra.authorizeFlag, depostiAuthAddress, fee, currentLedger);
          // }

          // if (type === 'modifyMultiSigners') {
          //      const tx = this.xrplTransactionService.buildModifyMultiSignTransaction(wallet, fee, currentLedger);
          //      if (extra.enableMultiSignFlag === 'Y') {
          //           tx.SignerEntries = extra.formattedSignerEntries;
          //           tx.SignerQuorum = Number(this.txUiService.signerQuorum());
          //      }
          //      return tx;
          // }

          // if (type === 'modifyRegularKey') {
          //      const tx = this.xrplTransactionService.buildModifySetRegularKeyTransaction(wallet, fee, currentLedger);
          //      if (extra.enableRegularKeyFlag === 'Y') {
          //           tx.RegularKey = this.txUiService.regularKeyAddress();
          //      }
          //      return tx;
          // }

          // if (type === 'modifyMetaData') {
          //      const tx = this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, currentLedger);
          //      if (extra.enableNftMinter === 'Y') {
          //           tx.NFTokenMinter = this.txUiService.nfTokenMinterAddress();
          //           tx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
          //      } else {
          //           tx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
          //      }
          //      return tx;
          // }

          // updateMetaData;
          return this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: CredentialTxType, formValues: any, env: any) {
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
               return this.executor.updateAccountFlags?.(tx as xrpl.AccountSet, wallet, client, opts);
          }

          // if (type === 'modifyAccountFlags') {
          //      return this.executor.createEscrow?.(tx as xrpl.EscrowCreate, wallet, client, opts);
          // }

          // if (type === 'modifyDepositAuth') {
          //      return this.executor.setDepositAuth?.(tx as xrpl.DepositPreauth, wallet, client, opts);
          // }

          // if (type === 'modifyMultiSigners') {
          //      return this.executor.setMultiSign?.(tx as xrpl.SignerListSet, wallet, client, opts);
          // }

          // if (type === 'modifyRegularKey') {
          //      return this.executor.setRegularKey?.(tx as xrpl.SetRegularKey, wallet, client, opts);
          // }

          // if (type === 'modifyMetaData') {
          //      return this.executor.setNftMinterAddress?.(tx as xrpl.AccountSet, wallet, client, opts);
          // }

          // updateMetaData
          return this.executor.updateMetaData?.(tx as xrpl.AccountSet, wallet, client, opts);
     }
}
