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
import { AppConstants } from '../../../core/app.constants';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountConfig, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
import { ACCOUNT_CONFIG_VALIDATION_RULES } from '../../../components/account-configurator/constants/account-configurator.constants';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplDateService = inject(XrplDateService);

     async executeModifyAccountTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const {
               wallet,
               simulate = false,
               amountField,
               nfTokenMinterAddress,
               setFlags,
               clearFlags,
               tickSize,
               transferRate,
               publicKey,
               domain,
               isMessageKey,
               depositAuthAddresses,
               signerQuorum,
               regularKeyAddress,
               regularKeySeed,
               isRegularKeyAddress,
               depsositAuthEntries,
               formattedDepsositAuthEntries,
               signerEntries,
               formattedSignerEntries,
               multiSignAddress,
               multiSignSeeds,
               authorizeFlag,
               enableRegularKeyFlag,
               enableMultiSignFlag,
               enableNftMinter,
               multiSign,
               destinationAddress,
               SignerWeight,
               useMultiSign,
               suppressIndividualFeedback,
               operations,
               preFetchedEnv,
               extra = {},
          } = config;

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

               const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    amountField,
                    nfTokenMinterAddress,
                    setFlags,
                    clearFlags,
                    tickSize,
                    transferRate,
                    publicKey,
                    domain,
                    isMessageKey,
                    depositAuthAddresses,
                    signerQuorum,
                    regularKeyAddress,
                    regularKeySeed,
                    isRegularKeyAddress,
                    depsositAuthEntries,
                    formattedDepsositAuthEntries,
                    signerEntries,
                    formattedSignerEntries,
                    multiSignAddress,
                    multiSignSeeds,
                    authorizeFlag,
                    enableRegularKeyFlag,
                    enableMultiSignFlag,
                    enableNftMinter,
                    multiSign,
                    destinationAddress,
                    SignerWeight,
                    useMultiSign,
                    suppressIndividualFeedback,
                    operations,
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
               const tx = this.buildModifyAccountTransaction(type, env.wallet || wallet, env, config, {
                    simulate,
                    amountField,
                    nfTokenMinterAddress,
                    setFlags,
                    clearFlags,
                    tickSize,
                    transferRate,
                    publicKey,
                    domain,
                    isMessageKey,
                    depositAuthAddresses,
                    signerQuorum,
                    regularKeyAddress,
                    regularKeySeed,
                    isRegularKeyAddress,
                    depsositAuthEntries,
                    formattedDepsositAuthEntries,
                    signerEntries,
                    formattedSignerEntries,
                    multiSignAddress,
                    multiSignSeeds,
                    authorizeFlag,
                    enableRegularKeyFlag,
                    enableMultiSignFlag,
                    enableNftMinter,
                    multiSign,
                    destinationAddress,
                    SignerWeight,
                    useMultiSign,
                    suppressIndividualFeedback,
                    operations,
                    extra,
               });

               // Optional fields
               await this.applyOptionalFields(
                    client,
                    tx,
                    wallet,
                    env.accountInfo,
                    type,
                    { simulate, multiSign, amountField, nfTokenMinterAddress, setFlags, clearFlags, tickSize, transferRate, publicKey, domain, isMessageKey, enableNftMinter, authorizeFlag, depositAuthAddresses, enableRegularKeyFlag, signerQuorum, depsositAuthEntries, formattedDepsositAuthEntries, signerEntries, formattedSignerEntries, regularKeyAddress, enableMultiSignFlag, multiSignAddress, multiSignSeeds, suppressIndividualFeedback, extra },
                    env
               );

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, {
                    simulate,
                    amountField,
                    nfTokenMinterAddress,
                    setFlags,
                    clearFlags,
                    tickSize,
                    transferRate,
                    publicKey,
                    domain,
                    isMessageKey,
                    depositAuthAddresses,
                    signerQuorum,
                    regularKeyAddress,
                    regularKeySeed,
                    isRegularKeyAddress,
                    depsositAuthEntries,
                    formattedDepsositAuthEntries,
                    signerEntries,
                    formattedSignerEntries,
                    multiSignAddress,
                    multiSignSeeds,
                    authorizeFlag,
                    enableRegularKeyFlag,
                    enableMultiSignFlag,
                    enableNftMinter,
                    multiSign,
                    destinationAddress,
                    SignerWeight,
                    useMultiSign,
                    suppressIndividualFeedback,
                    operations,
                    extra,
               });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.handleSimulationSuccess(type, { simulate, multiSign, amountField, nfTokenMinterAddress, setFlags, clearFlags, tickSize, transferRate, publicKey, domain, isMessageKey, enableNftMinter, authorizeFlag, depositAuthAddresses, signerQuorum, depsositAuthEntries, formattedDepsositAuthEntries, signerEntries, formattedSignerEntries, regularKeyAddress, enableRegularKeyFlag, enableMultiSignFlag, suppressIndividualFeedback, extra }, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type, { simulate, multiSign, amountField, nfTokenMinterAddress, setFlags, clearFlags, tickSize, transferRate, publicKey, domain, isMessageKey, enableNftMinter, authorizeFlag, depositAuthAddresses, signerQuorum, depsositAuthEntries, formattedDepsositAuthEntries, signerEntries, formattedSignerEntries, regularKeyAddress, enableRegularKeyFlag, enableMultiSignFlag, suppressIndividualFeedback, extra }, extra);
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeModifyAccountTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     async executeAccountSetFlagsTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; modifyCount?: number; validationError?: boolean; results?: Array<{ flagName: string; hash?: string; success: boolean; error?: string }>; error?: string }> {
          const {
               wallet,
               simulate = false,
               amountField,
               nfTokenMinterAddress,
               setFlags,
               clearFlags,
               tickSize,
               transferRate,
               publicKey,
               domain,
               isMessageKey,
               depositAuthAddresses,
               signerQuorum,
               regularKeyAddress,
               regularKeySeed,
               isRegularKeyAddress,
               depsositAuthEntries,
               formattedDepsositAuthEntries,
               signerEntries,
               formattedSignerEntries,
               multiSignAddress,
               multiSignSeeds,
               authorizeFlag,
               enableRegularKeyFlag,
               enableMultiSignFlag,
               enableNftMinter,
               multiSign,
               destinationAddress,
               SignerWeight,
               useMultiSign,
               suppressIndividualFeedback,
               operations,
               preFetchedEnv,
               extra = {},
          } = config;

          let env: any;
          let client: xrpl.Client;
          let fee: string;
          let txHash: string | undefined;
          let currentLedger: number;
          const results: Array<{ flagName: string; hash?: string; success: boolean; error?: string }> = [];

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

               const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    amountField,
                    nfTokenMinterAddress,
                    setFlags,
                    clearFlags,
                    tickSize,
                    transferRate,
                    publicKey,
                    domain,
                    isMessageKey,
                    depositAuthAddresses,
                    signerQuorum,
                    regularKeyAddress,
                    regularKeySeed,
                    isRegularKeyAddress,
                    depsositAuthEntries,
                    formattedDepsositAuthEntries,
                    signerEntries,
                    formattedSignerEntries,
                    multiSignAddress,
                    multiSignSeeds,
                    authorizeFlag,
                    enableRegularKeyFlag,
                    enableMultiSignFlag,
                    enableNftMinter,
                    multiSign,
                    destinationAddress,
                    SignerWeight,
                    useMultiSign,
                    suppressIndividualFeedback,
                    operations,
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

               const ops = operations as Array<{
                    operation: 'SetFlag' | 'ClearFlag';
                    flagValue: string;
                    flagName: string;
               }>;

               for (const op of ops) {
                    // Build transaction
                    const tx = this.buildModifyAccountTransaction(type, env.wallet || wallet, env, config, { simulate, multiSign, setFlags, clearFlags, suppressIndividualFeedback, extra, ...extra, flagValue: op.flagValue, operation: op.operation });

                    // Optional fields
                    await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, { simulate, multiSign, amountField, nfTokenMinterAddress, setFlags, clearFlags, tickSize, transferRate, publicKey, domain, isMessageKey, enableNftMinter, authorizeFlag, depositAuthAddresses, enableRegularKeyFlag, enableMultiSignFlag, suppressIndividualFeedback, extra }, env);

                    // Execute
                    const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, {
                         simulate,
                         amountField,
                         nfTokenMinterAddress,
                         setFlags,
                         clearFlags,
                         tickSize,
                         transferRate,
                         publicKey,
                         domain,
                         isMessageKey,
                         depositAuthAddresses,
                         signerQuorum,
                         regularKeyAddress,
                         regularKeySeed,
                         isRegularKeyAddress,
                         depsositAuthEntries,
                         formattedDepsositAuthEntries,
                         signerEntries,
                         formattedSignerEntries,
                         multiSignAddress,
                         multiSignSeeds,
                         authorizeFlag,
                         enableRegularKeyFlag,
                         enableMultiSignFlag,
                         enableNftMinter,
                         multiSign,
                         destinationAddress,
                         SignerWeight,
                         useMultiSign,
                         suppressIndividualFeedback,
                         operations,
                         extra,
                    });

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

               if (simulate) {
                    const msg = `Simulated ${successCount} flag update${successCount === 1 ? '' : 's'} successfully!`;
                    this.toastService.success(msg, AppConstants.TOAST.SUCCESS);
                    return {
                         success: true,
                         modifyCount: successCount,
                         results,
                    };
               }

               const lastLedger = env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;

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

     async executeDepositAuthTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; modifyCount?: number; validationError?: boolean; deletedHashes?: { depostiAuthAddress: string; hash: string }[]; error?: string }> {
          const {
               wallet,
               simulate = false,
               amountField,
               nfTokenMinterAddress,
               setFlags,
               clearFlags,
               tickSize,
               transferRate,
               publicKey,
               domain,
               isMessageKey,
               depositAuthAddresses,
               signerQuorum,
               regularKeyAddress,
               regularKeySeed,
               isRegularKeyAddress,
               depsositAuthEntries,
               formattedDepsositAuthEntries,
               signerEntries,
               formattedSignerEntries,
               multiSignAddress,
               multiSignSeeds,
               authorizeFlag,
               enableRegularKeyFlag,
               enableMultiSignFlag,
               enableNftMinter,
               multiSign,
               destinationAddress,
               SignerWeight,
               useMultiSign,
               suppressIndividualFeedback,
               operations,
               preFetchedEnv,
               extra = {},
          } = config;

          let env: any;
          let client: xrpl.Client;
          let fee: string;
          let txHash: string | undefined;
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

               // Use pre-fetched env if provided, otherwise fetch
               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    currentLedger = env.ledgerInfo.lastLedger;
               } else {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                    });
                    currentLedger = env.ledgerInfo.lastLedger;
               }

               client = env.client;

               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    amountField,
                    nfTokenMinterAddress,
                    setFlags,
                    clearFlags,
                    tickSize,
                    transferRate,
                    publicKey,
                    domain,
                    isMessageKey,
                    depositAuthAddresses,
                    signerQuorum,
                    regularKeyAddress,
                    regularKeySeed,
                    isRegularKeyAddress,
                    depsositAuthEntries,
                    formattedDepsositAuthEntries,
                    signerEntries,
                    formattedSignerEntries,
                    multiSignAddress,
                    multiSignSeeds,
                    authorizeFlag,
                    enableRegularKeyFlag,
                    enableMultiSignFlag,
                    enableNftMinter,
                    multiSign,
                    destinationAddress,
                    SignerWeight,
                    useMultiSign,
                    suppressIndividualFeedback,
                    operations,
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

               for (const depostiAuthAddress of depositAuthAddresses) {
                    const address = depostiAuthAddress.account;
                    config.destinationAddress = address;
                    const tx = this.buildModifyAccountTransaction(type, env.wallet || wallet, env, config, {
                         simulate,
                         amountField,
                         nfTokenMinterAddress,
                         setFlags,
                         clearFlags,
                         tickSize,
                         transferRate,
                         publicKey,
                         domain,
                         isMessageKey,
                         depositAuthAddresses,
                         signerQuorum,
                         regularKeyAddress,
                         regularKeySeed,
                         isRegularKeyAddress,
                         depsositAuthEntries,
                         formattedDepsositAuthEntries,
                         signerEntries,
                         formattedSignerEntries,
                         multiSignAddress,
                         multiSignSeeds,
                         authorizeFlag,
                         enableRegularKeyFlag,
                         enableMultiSignFlag,
                         enableNftMinter,
                         multiSign,
                         destinationAddress,
                         SignerWeight,
                         useMultiSign,
                         suppressIndividualFeedback,
                         operations,
                         extra,
                    });

                    await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, { simulate, multiSign, amountField, nfTokenMinterAddress, setFlags, clearFlags, tickSize, transferRate, publicKey, domain, isMessageKey, enableNftMinter, authorizeFlag, depositAuthAddresses, enableRegularKeyFlag, signerQuorum, depsositAuthEntries, formattedDepsositAuthEntries, signerEntries, formattedSignerEntries, regularKeyAddress, enableMultiSignFlag, suppressIndividualFeedback, extra }, env);

                    const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, {
                         simulate,
                         amountField,
                         nfTokenMinterAddress,
                         setFlags,
                         clearFlags,
                         tickSize,
                         transferRate,
                         publicKey,
                         domain,
                         isMessageKey,
                         depositAuthAddresses,
                         signerQuorum,
                         regularKeyAddress,
                         regularKeySeed,
                         isRegularKeyAddress,
                         depsositAuthEntries,
                         formattedDepsositAuthEntries,
                         signerEntries,
                         formattedSignerEntries,
                         multiSignAddress,
                         multiSignSeeds,
                         authorizeFlag,
                         enableRegularKeyFlag,
                         enableMultiSignFlag,
                         enableNftMinter,
                         multiSign,
                         destinationAddress,
                         SignerWeight,
                         useMultiSign,
                         suppressIndividualFeedback,
                         operations,
                         extra,
                    });

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

               if (simulate) {
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

     private buildValidationInputs(type: AccountConfigAction, wallet: Wallet, env: any, values: any) {
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
               case 'modifyAccountSetFlags':
               case 'modifyAccountFlags':
                    return { ...base, modifyAccountFlags: { setFlags: values.setFlags || [], clearFlags: values.clearFlags || [] } };
               case 'modifyDepositAuth':
                    return { ...base, modifyDepositAuth: { depsositAuthEntries: values.depsositAuthEntries, authorizeFlag: values.authorizeFlag } };
               case 'modifyMultiSigners':
                    return { ...base, modifyMultiSigners: { formattedSignerEntries: values.formattedSignerEntries, signerQuorum: values.signerQuorum } };
               case 'modifyRegularKey':
                    return { ...base, modifyRegularKey: { regularKeyAddress: values.regularKeyAddress, regularKeySeed: values.regularKeySeed } };
               case 'modifyMetaData':
                    return { ...base, modifyMetaData: { nfTokenMinterAddress: values.nfTokenMinterAddress } };
               case 'updateMetaData':
                    return { ...base, updateMetaData: { tickSize: values.tickSize, transferRate: values.transferRate, userEmail: values.userEmail, domain: values.domain } };
          }
     }

     private buildModifyAccountTransaction(type: AccountConfigAction, wallet: xrpl.Wallet, env: any, config: any, extra: any): xrpl.Transaction {
          const { fee, ledgerInfo } = env;
          let tx: any;
          switch (type) {
               case 'modifyAccountSetFlags':
               case 'modifyAccountFlags': {
                    const flagValue = extra.flagValue;
                    const operation = extra.operation; // 'SetFlag' | 'ClearFlag'
                    tx = this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, ledgerInfo.lastIndex);
                    if (operation === 'SetFlag') {
                         tx.SetFlag = Number(flagValue);
                    } else {
                         tx.ClearFlag = Number(flagValue);
                    }
                    return tx;
               }
               case 'modifyDepositAuth':
                    return this.xrplTransactionService.buildModifyDepositAuthTransaction(wallet, extra.authorizeFlag, config.destinationAddress, fee, ledgerInfo.lastIndex);
               case 'modifyMultiSigners':
                    tx = this.xrplTransactionService.buildModifyMultiSignTransaction(wallet, fee, ledgerInfo.lastIndex);
                    if (extra.enableMultiSignFlag === 'Y') {
                         tx.SignerEntries = extra.formattedSignerEntries;
                         tx.SignerQuorum = Number(config.signerQuorum);
                    }
                    return tx;
               case 'modifyRegularKey':
                    tx = this.xrplTransactionService.buildModifySetRegularKeyTransaction(wallet, fee, ledgerInfo.lastIndex);
                    if (extra.enableRegularKeyFlag === 'Y') {
                         tx.RegularKey = config.regularKeyAddress;
                    }
                    return tx;
               case 'modifyMetaData':
                    tx = this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, ledgerInfo.lastIndex);
                    if (extra.enableNftMinter === 'Y') {
                         tx.NFTokenMinter = config.nfTokenMinterAddress;
                         tx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
                    } else {
                         tx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
                    }
                    return tx;
               case 'updateMetaData':
                    return this.xrplTransactionService.buildModifyAccountSetTransaction(wallet, fee, ledgerInfo.lastIndex);
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: AccountConfigAction, values: any, env: any) {
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
               if (values.tickSize) {
                    this.utilsService.setTickSize(tx, Number.parseInt(values.tickSize));
               }

               if (values.transferRate) {
                    const transferRate = percentToTransferRate(values.transferRate + '%');
                    this.utilsService.setTransferRate(tx, transferRate);
               }

               if (values.isMessageKey && env.wallet.publicKey) {
                    this.utilsService.setMessageKey(tx, env.wallet.publicKey);
               }

               if (values.domain && values.domain.trim() !== '') {
                    this.utilsService.setDomain(tx, values.domain);
               }
          }
     }

     private async executeSpecificTx(type: AccountConfigAction, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, values: any) {
          console.log('values: ', values);
          const opts = {
               useMultiSign: values.multiSign,
               isRegularKeyAddress: values.isRegularKeyAddress,
               regularKeyAddress: values.regularKeyAddress,
               regularKeySeed: values.regularKeySeed,
               multiSignAddress: values.multiSignAddress,
               multiSignSeeds: values.multiSignSeeds,
          };
          console.log('opts: ', opts);

          switch (type) {
               case 'modifyAccountSetFlags':
               case 'modifyAccountFlags':
                    return this.executor.updateAccountFlags?.(tx as xrpl.AccountSet, wallet, client, opts);
               case 'modifyDepositAuth':
                    return this.executor.setDepositAuth?.(tx as xrpl.DepositPreauth, wallet, client, opts);
               case 'modifyMultiSigners':
                    return this.executor.setMultiSign?.(tx as xrpl.SignerListSet, wallet, client, opts);
               case 'modifyRegularKey':
                    return this.executor.setRegularKey?.(tx as xrpl.SetRegularKey, wallet, client, opts);
               case 'modifyMetaData':
                    return this.executor.setNftMinterAddress?.(tx as xrpl.AccountSet, wallet, client, opts);
               case 'updateMetaData':
                    return this.executor.updateMetaData?.(tx as xrpl.AccountSet, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: AccountConfigAction, config: any, extra: any): string {
          if (type === 'modifyMetaData') {
               if (config.enableNftMinter === 'Y') {
                    return `Successfully Set NFT Minter ${config.nfTokenMinterAddress ? config.nfTokenMinterAddress : ''}`;
               } else {
                    return `Successfully Remove NFT Minter`;
               }
          }
          if (type === 'modifyRegularKey') {
               if (config.enableRegularKeyFlag === 'Y') {
                    return `Successfully Set Regular Key ${config.regularKeyAddress}`;
               } else {
                    return `Successfully Remove Regular Key ${config.regularKeyAddress ? config.regularKeyAddress : ''}`;
               }
          }

          if (type === 'modifyMultiSigners') {
               if (config.enableMultiSignFlag === 'Y') {
                    return `Successfully Set Multi Sign`;
               } else {
                    return `Successfully Removed Multi Sign`;
               }
          }

          if (type === 'updateMetaData') {
               return `Successfully Updated Account Meta Data`;
          }

          return `Successfully Cancelled Time Based Escrow ${config.escrowSequenceNumberField}`;
     }

     handleSimulationSuccess(type: AccountConfigAction, config: any, hash?: string, extra?: any) {
          let msg: string;

          if (type === 'modifyMetaData') {
               const address = config.nfTokenMinterAddress ?? '';
               msg = config.enableNftMinter === 'Y' ? `Simulated Setting NFT Minter ${address}` : `Simulated Removing NFT Minter ${address}`;
          } else if (type === 'modifyRegularKey') {
               if (config.enableRegularKeyFlag === 'Y') {
                    msg = `Successfully Simulated Setting Regular Key ${config.regularKeyAddress}`;
               } else {
                    msg = `Successfully Simulated Removing Regular Key ${config.regularKeyAddress ? config.regularKeyAddress : ''}`;
               }
          } else if (type === 'modifyMultiSigners') {
               if (config.enableMultiSignFlag === 'Y') {
                    msg = `Successfully Simulated Setting Multi Sign`;
               } else {
                    msg = `Successfully Simulated Removing Multi Sign`;
               }
          } else {
               msg = `Simulated Updating Account Meta Data`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
