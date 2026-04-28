import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { AccountConfiguratorTransactionBuilderService } from '../account-configurator-transaction-builder/account-configurator-transaction-builder.service';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountConfig, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
import { ACCOUNT_CONFIG_TX_TYPES, ACCOUNT_CONFIG_VALIDATION_RULES } from '../../../components/account-configurator/constants/account-configurator.constants';
import { AppConstants } from '../../../core/app.constants';

type AccountConfigTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; config: any }) => any;
     buildTx: (args: { orchestrator: AccountConfiguratorOrchestratorService; wallet: xrpl.Wallet; env: any; config: any; extra?: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { config: any }) => string;
     successMessage: (args: { config: any }) => string;
};

const ACCOUNT_CONFIG_META: Record<AccountConfigAction, AccountConfigTxMeta> = {
     modifyAccountSetFlags: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_SET_FLAGS],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyAccountFlags: { setFlags: config.setFlags || [], clearFlags: config.clearFlags || [] },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config),
          simulationToastMessage: () => `Simulated Updating Account Meta Data`,
          successMessage: () => `Operation completed`,
     },

     modifyAccountFlags: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_FLAGS],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyAccountFlags: { setFlags: config.setFlags || [], clearFlags: config.clearFlags || [] },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config),
          simulationToastMessage: () => `Simulated Updating Account Meta Data`,
          successMessage: () => `Operation completed`,
     },

     modifyDepositAuth: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_DEPOSIT_AUTH],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyDepositAuth: { depsositAuthEntries: config.depsositAuthEntries, authorizeFlag: config.authorizeFlag },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyDepositAuthTransaction(wallet, env, config),
          simulationToastMessage: ({ config }) => (config.authorizeFlag === 'Y' ? `Successfully Simulated Setting Deposit Auth` : `Successfully Simulated Removing Deposit Auth`),
          successMessage: ({ config }) => (config.authorizeFlag === 'Y' ? `Successfully Set Deposit Authorization(s)` : `Successfully Removed Deposit Authorization(s)`),
     },

     modifyMultiSigners: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_MULTI_SIGNERS],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyMultiSigners: { formattedSignerEntries: config.formattedSignerEntries, signerQuorum: config.signerQuorum },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyMultiSignTransaction(wallet, env, config),
          simulationToastMessage: ({ config }) => (config.enableMultiSignFlag === 'Y' ? `Successfully Simulated Setting Multi Sign` : `Successfully Simulated Removing Multi Sign`),
          successMessage: ({ config }) => (config.enableMultiSignFlag === 'Y' ? `Successfully Set Multi Sign` : `Successfully Removed Multi Sign`),
     },

     modifyRegularKey: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_REGULAR_KEY],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyRegularKey: { regularKeyAddress: config.regularKeyAddress, regularKeySeed: config.regularKeySeed },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifySetRegularKeyTransaction(wallet, env, config),
          simulationToastMessage: ({ config }) => (config.enableRegularKeyFlag === 'Y' ? `Successfully Simulated Setting Regular Key ${config.regularKeyAddress}` : `Successfully Simulated Removing Regular Key ${config.regularKeyAddress ?? ''}`),
          successMessage: ({ config }) => (config.enableRegularKeyFlag === 'Y' ? `Successfully Set Regular Key ${config.regularKeyAddress}` : `Successfully Remove Regular Key ${config.regularKeyAddress ?? ''}`),
     },

     modifyMetaData: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_META_DATA],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               modifyMetaData: { nfTokenMinterAddress: config.nfTokenMinterAddress },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config),
          simulationToastMessage: ({ config }) => {
               const address = config.nfTokenMinterAddress ?? '';
               return config.enableNftMinter === 'Y' ? `Simulated Setting NFT Minter ${address}` : `Simulated Removing NFT Minter ${address}`;
          },
          successMessage: ({ config }) => (config.enableNftMinter === 'Y' ? `Successfully Set NFT Minter ${config.nfTokenMinterAddress ?? ''}` : `Successfully Remove NFT Minter`),
     },

     updateMetaData: {
          validationRule: ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.UPDATE_META_DATA],
          buildValidationInputs: ({ wallet, env, config }) => ({
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: { isRegularKey: config.isRegularKeyAddress, address: config.regularKeyAddress, seed: config.regularKeySeed },
               updateMetaData: { tickSize: config.tickSize, transferRate: config.transferRate, userEmail: config.userEmail, domain: config.domain },
          }),
          buildTx: ({ orchestrator, wallet, env, config }) => orchestrator.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config),
          simulationToastMessage: () => `Simulated Updating Account Meta Data`,
          successMessage: () => `Successfully Updated Account Meta Data`,
     },
};

function buildSigningOpts(account: any, txOptions: any) {
     return {
          useMultiSign: txOptions?.useMultiSign,
          multiSignAddress: account?.multiSignAddress,
          multiSignSeeds: account?.multiSignSeeds,
          isRegularKeyAddress: txOptions?.isRegularKeyAddress,
          regularKeySeed: account?.regularKeySeed,
          regularKeyAddress: account?.regularKeyAddress,
     };
}

@Injectable({ providedIn: 'root' })
export class AccountConfiguratorOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly accountConfiguratorTransactionBuilderService = inject(AccountConfiguratorTransactionBuilderService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly toastService = inject(ToastService);
     public readonly xrplDateService = inject(XrplDateService);

     async executeModifyAccountTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const { account, txOptions, preFetchedEnv, wallet } = config;
          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = ACCOUNT_CONFIG_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, config: account });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, wallet: env.wallet || wallet, env, config });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

               // Balance check
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               //  Submit / simulate
               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,

                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                    skipBalanceCheck: true,
                    ui: { suppressIndividualFeedback: false },
                    signing: buildSigningOpts(account, txOptions),
                    buildTx: () => tx as any,
               });

               if (!submitOrSimResult.success) return { success: false, error: submitOrSimResult.error };

               txHash = submitOrSimResult.hash;

               // Simulated toast
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, config, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ config: account });
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

     // Parallel Account set path
     async executeAccountSetFlagsTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; modifyCount?: number; validationError?: boolean; results?: Array<{ flagName: string; hash?: string; success: boolean; error?: string }>; error?: string }> {
          const { wallet, preFetchedEnv, operations = [], txOptions, account } = config;
          let env: any;
          let client: xrpl.Client;
          const results: Array<{ flagName: string; hash?: string; success: boolean; error?: string }> = [];

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               const baseSequence = env.accountInfo.result.account_data.Sequence;

               // Validation
               const meta = ACCOUNT_CONFIG_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, config });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               const ops = operations as Array<{ operation: 'SetFlag' | 'ClearFlag'; flagValue: string; flagName: string }>;

               // Parallel submission
               const submissionResults = await this.runWithConcurrencyLimit(ops, 3, async (op, index) => {
                    try {
                         config.flagValue = op.flagValue;
                         config.operation = op.operation;

                         const tx = meta.buildTx({ orchestrator: this, wallet: env.wallet || wallet, env, config });
                         tx.Sequence = baseSequence + index;
                         tx.LastLedgerSequence = env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;

                         await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

                         const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                              client,
                              wallet: env.wallet || wallet,
                              env,
                              mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                              skipBalanceCheck: true,
                              ui: { suppressIndividualFeedback: true },
                              signing: buildSigningOpts(config.account, txOptions),
                              buildTx: () => tx as any,
                         });

                         if (!submitOrSimResult?.success) {
                              const simResult = submitOrSimResult as any;
                              return { flagName: op.flagName, success: false, error: simResult?.error, hash: simResult?.hash };
                         }

                         return { flagName: op.flagName, success: true, hash: submitOrSimResult.hash, tx };
                    } catch (err: any) {
                         return { flagName: op.flagName, success: false, error: err?.message || 'Submission failed' };
                    }
               });

               // Ordered confirmation
               for (const result of submissionResults) {
                    if (!result.success || !result.hash) {
                         results.push(result);
                         continue;
                    }

                    if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, config, '');

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash, result.tx.LastLedgerSequence);
                         this.txUiService.addTxResultSignal(finalResult);
                         results.push({ flagName: result.flagName, success: true, hash: result.hash });
                    } catch (err: any) {
                         results.push({ flagName: result.flagName, success: false, hash: result.hash, error: err?.message || 'Confirmation failed' });
                    }
               }

               // Toast summary
               const succeeded = results.filter(r => r.success);
               const failed = results.filter(r => !r.success);

               if (succeeded.length > 0) {
                    this.toastService.successMultipleHashes(
                         `${succeeded.length} flag update(s) succeeded`,
                         AppConstants.TOAST.SUCCESS,
                         succeeded.map(r => ({ hash: r.hash!, label: r.flagName })),
                         `${this.txUiService.explorerUrl()}tx/`
                    );
               }

               if (failed.length > 0) {
                    this.toastService.errorMultipleHashes?.(
                         `${failed.length} flag update(s) failed`,
                         AppConstants.TOAST.ERROR,
                         failed.map(r => ({ hash: r.hash, label: r.flagName, error: r.error })),
                         `${this.txUiService.explorerUrl()}tx/`
                    );
               }

               return { success: succeeded.length > 0 || operations.length === 0, modifyCount: succeeded.length, results };
          } catch (err: any) {
               console.error(`[${type}] executeAccountSetFlagsTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     // Parallel deposit auth path
     async executeDepositAuthTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; modifyCount?: number; validationError?: boolean; results?: Array<{ address: string; hash?: string; success: boolean; error?: string }>; error?: string }> {
          const { wallet, preFetchedEnv, account, txOptions } = config;
          let env: any;
          let client: xrpl.Client;
          const results: Array<{ address: string; hash?: string; success: boolean; error?: string }> = [];

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               const baseSequence = env.accountInfo.result.account_data.Sequence;

               // Validation
               const meta = ACCOUNT_CONFIG_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, config });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Parallel submission
               const submissionResults = await this.runWithConcurrencyLimit<{ account: string }>(account.depositAuthAddresses, 3, async (entry, index) => {
                    const address = entry.account;

                    try {
                         const tx = meta.buildTx({
                              orchestrator: this,
                              wallet: env.wallet || wallet,
                              env,
                              config: { ...config, destinationAddress: address },
                         });

                         tx.Sequence = baseSequence + index;
                         tx.LastLedgerSequence = env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;

                         await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

                         const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                              client,
                              wallet: env.wallet || wallet,
                              env,
                              mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                              skipBalanceCheck: true,
                              ui: { suppressIndividualFeedback: true },
                              signing: buildSigningOpts(config.account, txOptions),
                              buildTx: () => tx as any,
                         });

                         if (!submitOrSimResult?.success) {
                              const hash = (submitOrSimResult as any)?.hash as string | undefined;
                              const error = submitOrSimResult?.error;
                              return { address, success: false, error, hash };
                         }

                         return { address, success: true, hash: submitOrSimResult.hash, tx };
                    } catch (err: any) {
                         return { address, success: false, error: err?.message || 'Submission failed' };
                    }
               });

               // Ordered confirmation
               for (const result of submissionResults) {
                    if (!result.success || !result.hash) {
                         results.push(result);
                         continue;
                    }

                    if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, config, '');

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash, result.tx.LastLedgerSequence);
                         this.txUiService.addTxResultSignal(finalResult);
                         results.push({ address: result.address, success: true, hash: result.hash });
                    } catch (err: any) {
                         results.push({ address: result.address, success: false, hash: result.hash, error: err?.message || 'Confirmation failed' });
                    }
               }

               // Toast summary
               const succeeded = results.filter(r => r.success);
               const failed = results.filter(r => !r.success);

               if (succeeded.length > 0) {
                    this.toastService.successMultipleHashesWithDepositAuth(
                         `${succeeded.length} deposit authorization(s) succeeded`,
                         succeeded.map(r => ({ depostiAuthAddress: r.address, hash: r.hash! })),
                         `${this.txUiService.explorerUrl()}tx/`,
                         AppConstants.TOAST.SUCCESS
                    );
               }

               if (failed.length > 0) {
                    this.toastService.buildMultiErrorMessage(
                         failed.map(f => ({ address: f.address, hash: f.hash, error: f.error || 'Unknown error' })),
                         'deposit auth update',
                         `${this.txUiService.explorerUrl()}tx/`,
                         AppConstants.TOAST.ERROR
                    );
               }

               return {
                    success: succeeded.length > 0 || account.depositAuthAddresses.length === 0,
                    modifyCount: succeeded.length,
                    results,
               };
          } catch (err: any) {
               console.error(`[${type}] executeDepositAuthTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     async runWithConcurrencyLimit<T>(items: T[], limit: number, handler: (item: T, index: number) => Promise<any>): Promise<any[]> {
          const results: any[] = new Array(items.length);
          let index = 0;

          const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
               while (index < items.length) {
                    const currentIndex = index++;
                    try {
                         results[currentIndex] = await handler(items[currentIndex], currentIndex);
                    } catch (err) {
                         results[currentIndex] = { success: false, error: err };
                    }
               }
          });

          await Promise.all(workers);
          return results;
     }

     handleSimulationSuccess(type: AccountConfigAction, config: any, hash?: string) {
          const msg = ACCOUNT_CONFIG_META[type].simulationToastMessage({ config: config.account ?? config });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}

// import { inject, Injectable } from '@angular/core';
// import * as xrpl from 'xrpl';
// import { Wallet } from '../../wallets/manager/wallet-manager.service';
// import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
// import { ValidationService } from '../../validation/transaction-validation-rule.service';
// import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
// import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
// import { ToastService } from '../../toast/toast.service';
// import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
// import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
// import { AppConstants } from '../../../core/app.constants';
// import { XrplDateService } from '../../../core/xrpl-date.service';
// import { AccountConfig, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
// import { ACCOUNT_CONFIG_VALIDATION_RULES } from '../../../components/account-configurator/constants/account-configurator.constants';
// import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
// import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
// import { AccountConfiguratorTransactionBuilderService } from '../account-configurator-transaction-builder/account-configurator-transaction-builder.service';
// import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';

// @Injectable({
//      providedIn: 'root',
// })
// export class AccountConfiguratorOrchestratorService extends PerformanceBaseComponent {
//      private readonly txEnvironmentService = inject(TxEnvironmentService);
//      private readonly validator = inject(ValidationService);
//      private readonly executor = inject(XrplTransactionExecutorService);
//      private readonly toastService = inject(ToastService);
//      private readonly txUiService = inject(TransactionUiService);
//      public readonly xrplTransactionService = inject(XrplTransactionService);
//      public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
//      public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
//      public readonly accountConfiguratorTransactionBuilderService = inject(AccountConfiguratorTransactionBuilderService);
//      public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
//      public readonly xrplDateService = inject(XrplDateService);

//      async executeModifyAccountTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
//           const { account, txOptions, preFetchedEnv, wallet } = config;
//           let env: any;
//           let client: xrpl.Client;
//           let txHash: string | undefined;

//           try {
//                this.txUiService.resetCurrentStepToIdle();
//                this.txUiService.clearAllOptionsAndMessages();

//                // Use pre-fetched env if provided, otherwise fetch
//                env =
//                     preFetchedEnv ??
//                     (await this.txEnvironmentService.prepareTxEnvironment({
//                          includeAccountInfo: true,
//                          includeAccountObject: true,
//                          includeFee: true,
//                          includeLedgerInfo: true,
//                          includeServerInfo: true,
//                     }));

//                client = env.client;
//                if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

//                // Validation
//                const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
//                const validationInputs = this.buildValidationInputs(type, wallet, env, account);
//                const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
//                if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

//                // Build transaction
//                const tx = this.buildModifyAccountTransaction(type, env.wallet || wallet, env, config, account);

//                // Optional fields
//                await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

//                // Check balances
//                const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
//                if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

//                // Execute
//                const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, account, txOptions);
//                if (!execResult.success) return { success: false, error: execResult.error };
//                txHash = execResult.hash;

//                if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, config, txHash);

//                const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
//                this.txUiService.setTxResultSignal(finalResult);

//                const message = this.buildSuccessMessage(type, account);
//                this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

//                return { success: true, hash: txHash };
//           } catch (err: any) {
//                console.error(`[${type}] executeModifyAccountTx failed:`, err);
//                this.xrplTransactionService.processTxError(err);
//                return { success: false, error: err.message || 'Unexpected error', validationError: false };
//           } finally {
//                this.txUiService.resetCurrentStepToIdle();
//           }
//      }

//      async executeAccountSetFlagsTx(type: AccountConfigAction, config: AccountConfig): Promise<{ success: boolean; modifyCount?: number; validationError?: boolean; results?: Array<{ flagName: string; hash?: string; success: boolean; error?: string }>; error?: string }> {
//           const { wallet, preFetchedEnv, operations = [], txOptions } = config;

//           let env: any;
//           let client: xrpl.Client;

//           const results: Array<{ flagName: string; hash?: string; success: boolean; error?: string }> = [];

//           try {
//                this.txUiService.resetCurrentStepToIdle();
//                this.txUiService.clearAllOptionsAndMessages();

//                // Use pre-fetched env if provided, otherwise fetch
//                env =
//                     preFetchedEnv ??
//                     (await this.txEnvironmentService.prepareTxEnvironment({
//                          includeAccountInfo: true,
//                          includeAccountObject: true,
//                          includeFee: true,
//                          includeLedgerInfo: true,
//                          includeServerInfo: true,
//                     }));

//                client = env.client;

//                if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

//                const baseSequence = env.accountInfo.result.account_data.Sequence;

//                // Validation
//                const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
//                const validationInputs = this.buildValidationInputs(type, wallet, env, config);
//                const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
//                if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

//                const ops = operations as Array<{ operation: 'SetFlag' | 'ClearFlag'; flagValue: string; flagName: string }>;

//                // Parallel submission
//                const submissionResults = await this.xrplTransactionService.runWithConcurrencyLimit(ops, 3, async (op, index) => {
//                     try {
//                          config.flagValue = op.flagValue;
//                          config.operation = op.operation;
//                          const tx = this.buildModifyAccountTransaction(type, env.wallet || wallet, env, config, {
//                               ...config,
//                               // flagValue: op.flagValue,
//                               // operation: op.operation,
//                          });

//                          tx.Sequence = baseSequence + index;

//                          tx.LastLedgerSequence = env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;

//                          await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

//                          const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, config.account, txOptions);

//                          if (!execResult?.success) {
//                               return {
//                                    flagName: op.flagName,
//                                    success: false,
//                                    error: execResult?.error,
//                                    hash: execResult?.hash,
//                               };
//                          }

//                          return {
//                               flagName: op.flagName,
//                               success: true,
//                               hash: execResult.hash,
//                               tx,
//                          };
//                     } catch (err: any) {
//                          return {
//                               flagName: op.flagName,
//                               success: false,
//                               error: err?.message || 'Submission failed',
//                          };
//                     }
//                });

//                // Ordered confirmation
//                for (const result of submissionResults) {
//                     if (!result.success || !result.hash) {
//                          results.push(result);
//                          continue;
//                     }

//                     // Simuation short circuit
//                     if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, config, '');

//                     try {
//                          const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash, result.tx.LastLedgerSequence);

//                          this.txUiService.addTxResultSignal(finalResult);

//                          results.push({
//                               flagName: result.flagName,
//                               success: true,
//                               hash: result.hash,
//                          });
//                     } catch (err: any) {
//                          results.push({
//                               flagName: result.flagName,
//                               success: false,
//                               hash: result.hash,
//                               error: err?.message || 'Confirmation failed',
//                          });
//                     }
//                }

//                const successCount = results.filter(r => r.success).length;

//                const failed = results.filter(r => !r.success);
//                const succeeded = results.filter(r => r.success);

//                if (succeeded.length > 0) {
//                     this.toastService.successMultipleHashes(
//                          `${succeeded.length} flag update(s) succeeded`,
//                          AppConstants.TOAST.SUCCESS,
//                          succeeded.map(r => ({ hash: r.hash!, label: r.flagName })),
//                          `${this.txUiService.explorerUrl()}tx/`
//                     );
//                }

//                if (failed.length > 0) {
//                     this.toastService.errorMultipleHashes?.(
//                          `${failed.length} flag update(s) failed`,
//                          AppConstants.TOAST.ERROR,
//                          failed.map(r => ({ hash: r.hash, label: r.flagName, error: r.error })),
//                          `${this.txUiService.explorerUrl()}tx/`
//                     );
//                }

//                return { success: successCount > 0 || operations.length === 0, modifyCount: successCount, results };
//           } catch (err: any) {
//                console.error(`[${type}] executeAccountSetFlagsTx failed:`, err);
//                this.xrplTransactionService.processTxError(err);
//                return { success: false, error: err.message || 'Unexpected error', validationError: false };
//           } finally {
//                this.txUiService.resetCurrentStepToIdle();
//           }
//      }

//      async executeDepositAuthTx(
//           type: AccountConfigAction,
//           config: AccountConfig
//      ): Promise<{
//           success: boolean;
//           modifyCount?: number;
//           validationError?: boolean;
//           results?: Array<{ address: string; hash?: string; success: boolean; error?: string }>;
//           error?: string;
//      }> {
//           const { wallet, preFetchedEnv, account, txOptions } = config;

//           let env: any;
//           let client: xrpl.Client;

//           const results: Array<{ address: string; hash?: string; success: boolean; error?: string }> = [];

//           try {
//                this.txUiService.resetCurrentStepToIdle();
//                this.txUiService.clearAllOptionsAndMessages();

//                // Use pre-fetched env if provided, otherwise fetch
//                env =
//                     preFetchedEnv ??
//                     (await this.txEnvironmentService.prepareTxEnvironment({
//                          includeAccountInfo: true,
//                          includeAccountObject: true,
//                          includeFee: true,
//                          includeLedgerInfo: true,
//                          includeServerInfo: true,
//                     }));

//                client = env.client;

//                if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
//                     throw new Error('Required network data missing');
//                }

//                const baseSequence = env.accountInfo.result.account_data.Sequence;

//                // Validation
//                const validationRule = ACCOUNT_CONFIG_VALIDATION_RULES[type];
//                const validationInputs = this.buildValidationInputs(type, wallet, env, config);
//                const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
//                if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

//                // Parallel submission
//                const submissionResults = await this.xrplTransactionService.runWithConcurrencyLimit<{ account: string }>(account.depositAuthAddresses, 3, async (entry, index) => {
//                     const address = entry.account;

//                     try {
//                          const tx = this.buildModifyAccountTransaction(
//                               type,
//                               env.wallet || wallet,
//                               env,
//                               { ...config, destinationAddress: address },
//                               {
//                                    ...config,
//                                    destinationAddress: address,
//                               }
//                          );

//                          // sequence fix
//                          tx.Sequence = baseSequence + index;
//                          tx.LastLedgerSequence = env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME;

//                          await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

//                          const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, config.account, txOptions);

//                          if (!execResult?.success) {
//                               return {
//                                    address,
//                                    success: false,
//                                    error: execResult?.error,
//                                    hash: execResult?.hash,
//                               };
//                          }

//                          return {
//                               address,
//                               success: true,
//                               hash: execResult.hash,
//                               tx,
//                          };
//                     } catch (err: any) {
//                          return {
//                               address,
//                               success: false,
//                               error: err?.message || 'Submission failed',
//                          };
//                     }
//                });

//                // Ordered confirmation
//                for (const result of submissionResults) {
//                     if (!result.success || !result.hash) {
//                          results.push(result);
//                          continue;
//                     }

//                     // Simuation short circuit
//                     if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, config, '');

//                     try {
//                          const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash, result.tx.LastLedgerSequence);

//                          this.txUiService.addTxResultSignal(finalResult);

//                          results.push({
//                               address: result.address,
//                               success: true,
//                               hash: result.hash,
//                          });
//                     } catch (err: any) {
//                          results.push({
//                               address: result.address,
//                               success: false,
//                               hash: result.hash,
//                               error: err?.message || 'Confirmation failed',
//                          });
//                     }
//                }

//                const successCount = results.filter(r => r.success).length;

//                const succeeded = results.filter(r => r.success);
//                const failed = results.filter(r => !r.success);

//                // Success toast
//                if (succeeded.length > 0) {
//                     this.toastService.successMultipleHashesWithDepositAuth(
//                          `${succeeded.length} deposit authorization(s) succeeded`,
//                          succeeded.map(r => ({ depostiAuthAddress: r.address, hash: r.hash! })),
//                          `${this.txUiService.explorerUrl()}tx/`,
//                          AppConstants.TOAST.SUCCESS
//                     );
//                }

//                // Error toast
//                if (failed.length > 0) {
//                     this.toastService.buildMultiErrorMessage(
//                          failed.map(f => ({
//                               address: f.address,
//                               hash: f.hash,
//                               error: f.error || 'Unknown error',
//                          })),
//                          'deposit auth update',
//                          `${this.txUiService.explorerUrl()}tx/`
//                     );
//                }

//                return {
//                     success: successCount > 0 || account.depositAuthAddresses.length === 0,
//                     modifyCount: successCount,
//                     results,
//                };
//           } catch (err: any) {
//                console.error(`[${type}] executeDepositAuthTx failed:`, err);
//                this.xrplTransactionService.processTxError(err);

//                return {
//                     success: false,
//                     error: err.message || 'Unexpected error',
//                     validationError: false,
//                };
//           } finally {
//                this.txUiService.resetCurrentStepToIdle();
//           }
//      }

//      private buildValidationInputs(type: AccountConfigAction, wallet: Wallet, env: any, config: any) {
//           const base = {
//                wallet,
//                network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
//                regularKey: {
//                     isRegularKey: config.isRegularKeyAddress,
//                     address: config.regularKeyAddress,
//                     seed: config.regularKeySeed,
//                },
//           };

//           switch (type) {
//                case 'modifyAccountSetFlags':
//                case 'modifyAccountFlags':
//                     return { ...base, modifyAccountFlags: { setFlags: config.setFlags || [], clearFlags: config.clearFlags || [] } };
//                case 'modifyDepositAuth':
//                     return { ...base, modifyDepositAuth: { depsositAuthEntries: config.depsositAuthEntries, authorizeFlag: config.authorizeFlag } };
//                case 'modifyMultiSigners':
//                     return { ...base, modifyMultiSigners: { formattedSignerEntries: config.formattedSignerEntries, signerQuorum: config.signerQuorum } };
//                case 'modifyRegularKey':
//                     return { ...base, modifyRegularKey: { regularKeyAddress: config.regularKeyAddress, regularKeySeed: config.regularKeySeed } };
//                case 'modifyMetaData':
//                     return { ...base, modifyMetaData: { nfTokenMinterAddress: config.nfTokenMinterAddress } };
//                case 'updateMetaData':
//                     return { ...base, updateMetaData: { tickSize: config.tickSize, transferRate: config.transferRate, userEmail: config.userEmail, domain: config.domain } };
//           }
//      }

//      private buildModifyAccountTransaction(type: AccountConfigAction, wallet: xrpl.Wallet, env: any, config: any, extra: any): xrpl.Transaction {
//           let tx: any;
//           switch (type) {
//                case 'modifyAccountSetFlags':
//                case 'modifyAccountFlags':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config);
//                case 'modifyDepositAuth':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifyDepositAuthTransaction(wallet, env, config);
//                case 'modifyMultiSigners':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifyMultiSignTransaction(wallet, env, config);
//                case 'modifyRegularKey':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifySetRegularKeyTransaction(wallet, env, config);
//                case 'modifyMetaData':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config);
//                case 'updateMetaData':
//                     return this.accountConfiguratorTransactionBuilderService.buildModifyAccountSetTransaction(wallet, env, config);
//           }
//      }

//      private async executeSpecificTx(type: AccountConfigAction, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
//           const opts = {
//                useMultiSign: txOptions.useMultiSign,
//                isRegularKeyAddress: txOptions.isRegularKeyAddress,
//                isSimulateEnabled: txOptions.isSimulateEnabled,
//                regularKeyAddress: account.regularKeyAddress,
//                regularKeySeed: account.regularKeySeed,
//                multiSignAddress: account.multiSignAddress,
//                multiSignSeeds: account.multiSignSeeds,
//           };

//           switch (type) {
//                case 'modifyAccountSetFlags':
//                case 'modifyAccountFlags':
//                     return this.executor.updateAccountFlags?.(env, tx as xrpl.AccountSet, wallet, client, opts);
//                case 'modifyDepositAuth':
//                     return this.executor.setDepositAuth?.(env, tx as xrpl.DepositPreauth, wallet, client, opts);
//                case 'modifyMultiSigners':
//                     return this.executor.setMultiSign?.(env, tx as xrpl.SignerListSet, wallet, client, opts);
//                case 'modifyRegularKey':
//                     return this.executor.setRegularKey?.(env, tx as xrpl.SetRegularKey, wallet, client, opts);
//                case 'modifyMetaData':
//                     return this.executor.setNftMinterAddress?.(env, tx as xrpl.AccountSet, wallet, client, opts);
//                case 'updateMetaData':
//                     return this.executor.updateMetaData?.(env, tx as xrpl.AccountSet, wallet, client, opts);
//           }
//      }

//      buildSuccessMessage(type: AccountConfigAction, config: any) {
//           switch (type) {
//                case 'modifyMetaData':
//                     if (config.enableNftMinter === 'Y') return `Successfully Set NFT Minter ${config.nfTokenMinterAddress ? config.nfTokenMinterAddress : ''}`;
//                     else return `Successfully Remove NFT Minter`;
//                case 'modifyRegularKey':
//                     if (config.enableRegularKeyFlag === 'Y') return `Successfully Set Regular Key ${config.regularKeyAddress}`;
//                     else return `Successfully Remove Regular Key ${config.regularKeyAddress ? config.regularKeyAddress : ''}`;
//                case 'modifyMultiSigners':
//                     if (config.enableMultiSignFlag === 'Y') return `Successfully Set Multi Sign`;
//                     else return `Successfully Removed Multi Sign`;
//                case 'updateMetaData':
//                     return `Successfully Updated Account Meta Data`;
//                case 'modifyDepositAuth':
//                     if (config.authorizeFlag === 'Y') return 'Successfully Set Deposit Authorization(s)';
//                     else return 'Successfully Removed Deposit Authorization(s)';
//                default:
//                     return 'Operation completed';
//           }
//      }

//      handleSimulationSuccess(type: AccountConfigAction, config: any, hash?: string) {
//           let msg: string;

//           switch (type) {
//                case 'modifyMetaData': {
//                     const address = config.nfTokenMinterAddress ?? '';
//                     msg = config.enableNftMinter === 'Y' ? `Simulated Setting NFT Minter ${address}` : `Simulated Removing NFT Minter ${address}`;
//                     break;
//                }
//                case 'modifyRegularKey': {
//                     msg = config.enableRegularKeyFlag === 'Y' ? `Successfully Simulated Setting Regular Key ${config.regularKeyAddress}` : `Successfully Simulated Removing Regular Key ${config.regularKeyAddress ?? ''}`;
//                     break;
//                }
//                case 'modifyMultiSigners':
//                     msg = config.enableMultiSignFlag === 'Y' ? `Successfully Simulated Setting Multi Sign` : `Successfully Simulated Removing Multi Sign`;
//                     break;
//                case 'modifyDepositAuth':
//                     msg = config.authorizeFlag === 'Y' ? `Successfully Simulated Setting Deposit Auth` : `Successfully Simulated Removing Deposit Auth`;
//                     break;
//                default:
//                     msg = `Simulated Updating Account Meta Data`;
//           }

//           this.txUiService.resetCurrentStepToIdle();
//           this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

//           return { success: true, hash };
//      }
// }
