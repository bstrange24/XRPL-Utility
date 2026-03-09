import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../toast/toast.service';
import { percentToTransferRate } from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AccountConfiguratorUtilService } from '../account-configurator-util/account-configurator-util.service';
import { AppConstants } from '../../../core/app.constants';

export type AccountConfigTxType = 'modifyAccountFlags' | 'modifyMetaData' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey' | 'modifyAccountSetFlags';

interface AccountConfig {
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
export class AccountConfiguratorOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);

     async executeModifyAccountTx(type: AccountConfigTxType, config: AccountConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
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

               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env);

               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulateEnabled) {
                    return this.accountConfiguratorUtilService.handleSimulationSuccess(type, formValues, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);

               const message = this.accountConfiguratorUtilService.buildSuccessMessage(type, formValues, extra);
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

     async executeAccountSetFlagsTx(
          type: 'modifyAccountSetFlags',
          config: AccountConfig
     ): Promise<{
          success: boolean;
          modifyCount?: number;
          validationError?: boolean;
          results?: Array<{ flagName: string; hash?: string; success: boolean; error?: string }>;
          error?: string;
     }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let fee: string;
          let currentLedger: number;

          const results: Array<{ flagName: string; hash?: string; success: boolean; error?: string }> = [];

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;
                    fee = preFetchedEnv.fee;
                    currentLedger = preFetchedEnv.currentLedger;
               } else {
                    env = await this.TxEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         // includeTickets: true,     // only if you're actually using tickets here
                    });
                    client = env.client;
                    fee = env.fee!;
                    currentLedger = env.currentLedger!;
               }

               if (!env.accountInfo || !fee || !currentLedger) {
                    throw new Error('Missing required environment fields');
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

               const operations = extra['operations'] as Array<{
                    operation: 'SetFlag' | 'ClearFlag';
                    flagValue: string;
                    flagName: string;
               }>;

               for (const op of operations) {
                    const tx = this.buildModifyAccountTransaction(type, env.wallet, env, formValues, { ...extra, flagValue: op.flagValue, operation: op.operation });

                    await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env);

                    const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

                    const resultEntry = {
                         flagName: op.flagName,
                         hash: execResult.hash,
                         success: execResult.success ?? false,
                         error: execResult.error,
                    };

                    results.push(resultEntry);

                    if (!execResult.success) {
                         this.toastService.error(`Failed to ${op.operation} flag ${op.flagName}: ${execResult.error || 'Unknown error'}`, AppConstants.TOAST.ERROR);
                    }
               }

               const successCount = results.filter(r => r.success).length;

               if (isSimulateEnabled) {
                    const msg = `Simulated ${successCount} flag update${successCount === 1 ? '' : 's'} successfully!`;
                    this.toastService.success(msg, AppConstants.TOAST.SUCCESS);
                    return {
                         success: true,
                         modifyCount: successCount,
                         results,
                    };
               }

               const lastLedger = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

               for (const result of results) {
                    if (result.hash && result.success) {
                         // only wait on presumed successful submissions
                         try {
                              const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash, lastLedger);
                              this.txUiService.addTxResultSignal(finalResult);
                         } catch (waitError: any) {
                              console.warn(`Confirmation wait failed for ${result.flagName} (${result.hash.slice(0, 8)}...):`, waitError);
                              // do not fail the whole batch
                         }
                    }
               }

               const succeeded = results.filter(r => r.success);
               const failed = results.filter(r => !r.success);

               if (succeeded.length > 0) {
                    const names = succeeded.map(r => r.flagName).join(', ');
                    const msg = `${succeeded.length} flag update${succeeded.length === 1 ? '' : 's'} succeeded [${names}]`;
                    this.toastService.successMultipleHashes(
                         msg,
                         AppConstants.TOAST.SUCCESS,
                         succeeded.map(r => ({ hash: r.hash!, label: r.flagName })), // adapt to your toast method
                         `${this.txUiService.explorerUrl()}tx/`
                    );
               }

               if (failed.length > 0) {
                    const names = failed.map(r => r.flagName).join(', ');
                    const msg = `${failed.length} flag update${failed.length === 1 ? '' : 's'} failed [${names}]`;
                    this.toastService.errorMultipleHashes?.(
                         msg,
                         AppConstants.TOAST.ERROR,
                         failed.map(r => ({ hash: r.hash, label: r.flagName })),
                         `${this.txUiService.explorerUrl()}tx/`
                    );
               }

               if (successCount > 0) {
                    this.txUiService.currentStep.set('success');
               }

               return {
                    success: successCount > 0 || operations.length === 0,
                    modifyCount: successCount,
                    results,
               };
          } catch (err: any) {
               console.error('[executeAccountSetFlagsTx]', err);
               return {
                    success: false,
                    error: err.message || 'Batch account flag update failed',
               };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     async executeDepositAuthTx(
          type: AccountConfigTxType,
          config: AccountConfig
     ): Promise<{
          success: boolean;
          modifyCount?: number;
          validationError?: boolean;
          deletedHashes?: { depostiAuthAddress: string; hash: string }[];
          error?: string;
     }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulateEnabled = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let currentLedger: number;
          let modifiedResults: { depostiAuthAddress: string; hash: string }[] = [];
          let successCount = 0;

          const failedResults: Array<{
               address: string;
               hash: string;
               error: string;
          }> = [];

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;
                    currentLedger = preFetchedEnv.currentLedger;

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
                    currentLedger = env.currentLedger!;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Pre-fetched environment missing required fields');
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

               for (const depostiAuthAddress of extra['formattedDepsositAuthEntries']) {
                    const address = depostiAuthAddress.SignerEntry.Account;
                    const tx = this.buildModifyAccountTransaction(type, env.wallet, env, formValues, extra, address);

                    await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, formValues, env);

                    const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

                    if (!execResult.success) {
                         failedResults.push({
                              address,
                              hash: execResult.hash!,
                              error: execResult.error || 'Unknown error',
                         });
                         continue;
                    }

                    successCount++;
                    if (execResult.hash) {
                         modifiedResults.push({ depostiAuthAddress, hash: execResult.hash });
                    }
               }

               if (isSimulateEnabled) {
                    let msg = `Simulated deposit auth of ${successCount} accounts successfully!`;
                    if (failedResults.length > 0) {
                         msg += ` (${failedResults.length} failed)`;
                    }
                    this.toastService.success(msg, AppConstants.TOAST.SUCCESS);
                    return { success: successCount > 0, modifyCount: successCount, deletedHashes: modifiedResults };
               }

               const lastLedger = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

               for (const { hash, depostiAuthAddress } of modifiedResults) {
                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, hash, lastLedger);
                         this.txUiService.addTxResultSignal(finalResult);
                    } catch (waitError: any) {
                         console.warn(`Confirmation wait failed for deposit auth ${depostiAuthAddress} (${hash.slice(0, 8)}...):`, waitError);
                         // continue — don't fail whole batch
                    }
               }

               if (successCount > 0) {
                    const msg = `${successCount} deposit auth(s) modified successfully!`;
                    this.toastService.successMultipleHashesWithDepositAuth(msg, modifiedResults, this.txUiService.explorerUrl() + 'tx/', AppConstants.TOAST.SUCCESS);
                    this.txUiService.currentStep.set('success');
               }

               // Failures in one combined toast
               if (failedResults.length > 0) {
                    const txMessage = 'deposit auth update';
                    this.toastService.buildMultiErrorMessage(failedResults, txMessage, `${this.txUiService.explorerUrl()}tx/`);
               }

               return {
                    success: successCount > 0 || failedResults.length === 0,
                    modifyCount: successCount,
                    deletedHashes: modifiedResults,
               };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during modify account transaction';
               console.error(`[${type}] executeModifyAccountTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getValidationRuleName(type: AccountConfigTxType): string {
          const map: Record<AccountConfigTxType, string> = {
               modifyAccountFlags: 'CreateTimeBasedEscrow',
               modifyDepositAuth: 'SetDepositAuthAccounts',
               modifyMultiSigners: 'SetMultiSign',
               modifyRegularKey: 'SetRegularKey',
               modifyMetaData: 'SetNftMinterAddress',
               updateMetaData: 'UpdateMetaData',
               modifyAccountSetFlags: 'UpdateAccountFlags',
          };
          return map[type];
     }

     private buildValidationInputs(type: AccountConfigTxType, wallet: Wallet, env: any, formValues: any, extra?: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'modifyAccountSetFlags') {
               return {
                    ...base,
                    modifyAccountFlags: {
                         // if you later want to validate something about flags
                         setFlags: extra?.setFlags || [],
                         clearFlags: extra?.clearFlags || [],
                    },
               };
          }

          if (type === 'modifyAccountFlags') {
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

          if (type === 'modifyDepositAuth') {
               return {
                    ...base,
                    modifyDepositAuth: {
                         depsositAuthEntries: extra.depsositAuthEntries,
                         authorizeFlag: extra.authorizeFlag,
                    },
               };
          }

          if (type === 'modifyMultiSigners') {
               return {
                    ...base,
                    modifyMultiSigners: {
                         formattedSignerEntries: extra.formattedSignerEntries,
                         signerQuorum: formValues.signerQuorum,
                    },
               };
          }

          if (type === 'modifyRegularKey') {
               return {
                    ...base,
                    modifyRegularKey: {
                         regularKeyAddress: formValues.regularKeyAddress,
                         regularKeySeed: formValues.regularKeySeed,
                    },
               };
          }

          if (type === 'modifyMetaData') {
               return {
                    ...base,
                    modifyMetaData: {
                         nfTokenMinterAddress: formValues.nfTokenMinterAddress,
                    },
               };
          }

          // updateMetaData
          return {
               ...base,
               updateMetaData: {
                    tickSize: formValues.tickSize,
                    transferRate: formValues.transferRate,
                    userEmail: formValues.userEmail,
                    domain: formValues.domain,
               },
          };
     }

     private buildModifyAccountTransaction(type: AccountConfigTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any, depostiAuthAddress?: string): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'modifyAccountSetFlags') {
               const flagValue = extra.flagValue; // number | string
               const operation = extra.operation; // 'SetFlag' | 'ClearFlag'

               const tx = this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, env.fee, env.currentLedger);

               if (operation === 'SetFlag') {
                    tx.SetFlag = Number(flagValue); // must be number
               } else {
                    tx.ClearFlag = Number(flagValue);
               }

               return tx;
          }

          if (type === 'modifyAccountFlags') {
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

          if (type === 'modifyDepositAuth') {
               return this.xrplTransactionService.buildModifyDepositAuthTransaction(wallet, extra.authorizeFlag, depostiAuthAddress, fee, currentLedger);
          }

          if (type === 'modifyMultiSigners') {
               const tx = this.xrplTransactionService.buildModifyMultiSignTransaction(wallet, fee, currentLedger);
               if (extra.enableMultiSignFlag === 'Y') {
                    tx.SignerEntries = extra.formattedSignerEntries;
                    tx.SignerQuorum = Number(this.txUiService.signerQuorum());
               }
               return tx;
          }

          if (type === 'modifyRegularKey') {
               const tx = this.xrplTransactionService.buildModifySetRegularKeyTransaction(wallet, fee, currentLedger);
               if (extra.enableRegularKeyFlag === 'Y') {
                    tx.RegularKey = this.txUiService.regularKeyAddress();
               }
               return tx;
          }

          if (type === 'modifyMetaData') {
               const tx = this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, currentLedger);
               if (extra.enableNftMinter === 'Y') {
                    tx.NFTokenMinter = this.txUiService.nfTokenMinterAddress();
                    tx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               } else {
                    tx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               }
               return tx;
          }

          // updateMetaData;
          return this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, currentLedger);
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: AccountConfigTxType, formValues: any, env: any) {
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

          if (type === 'updateMetaData') {
               if (formValues.tickSize) {
                    this.utilsService.setTickSize(tx, Number.parseInt(formValues.tickSize));
               }

               if (formValues.transferRate) {
                    const transferRate = percentToTransferRate(formValues.transferRate + '%');
                    this.utilsService.setTransferRate(tx, transferRate);
               }

               if (formValues.isMessageKey && env.wallet.publicKey) {
                    this.utilsService.setMessageKey(tx, env.wallet.publicKey);
               }

               if (formValues.domain && formValues.domain.trim() !== '') {
                    this.utilsService.setDomain(tx, formValues.domain);
               }
          }
     }

     private async executeSpecificTx(type: AccountConfigTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          let opts = {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          };

          if (type === 'modifyAccountSetFlags') {
               return this.executor.updateAccountFlags?.(tx as xrpl.AccountSet, wallet, client, opts);
          }

          if (type === 'modifyAccountFlags') {
               return this.executor.createEscrow?.(tx as xrpl.EscrowCreate, wallet, client, opts);
          }

          if (type === 'modifyDepositAuth') {
               return this.executor.setDepositAuth?.(tx as xrpl.DepositPreauth, wallet, client, opts);
          }

          if (type === 'modifyMultiSigners') {
               return this.executor.setMultiSign?.(tx as xrpl.SignerListSet, wallet, client, opts);
          }

          if (type === 'modifyRegularKey') {
               return this.executor.setRegularKey?.(tx as xrpl.SetRegularKey, wallet, client, opts);
          }

          if (type === 'modifyMetaData') {
               return this.executor.setNftMinterAddress?.(tx as xrpl.AccountSet, wallet, client, opts);
          }

          // updateMetaData
          return this.executor.updateMetaData?.(tx as xrpl.AccountSet, wallet, client, opts);
     }
}
