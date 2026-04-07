import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { AppConstants } from '../../../core/app.constants';
import { MptUtilService } from '../mpt-util/mpt-util.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { MPT_TX_TYPES, MPT_VALIDATION_RULES } from '../../../components/mpt/constants/mpt.constants';
import { MptTransactionBuilderService } from '../mpt-transaction-builder/mpt-transaction-builder.service';
import { MptTxConfig, MptTxType } from '../../../components/mpt/constants/mpt.types';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';

type MptMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; mpt: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: MptOrchestratorServiceService; env: any; wallet: any; mpt: any; account: any; txOptions: any; type: MptTxType }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: MptOrchestratorServiceService; mpt: any }) => string;
     successMessage: (args: { orchestrator: MptOrchestratorServiceService; mpt: any }) => string;
};

const MPT_META: Record<MptTxType, MptMeta> = {
     createMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               createMpt: { amount: mpt.tokenCount, assetScaleField: mpt.assetScale, transferFeeField: mpt.transferFee, metaData: mpt.metaData },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildCreateMptTx(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Creating MPT of ${mpt.tokenCount} `,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Created MPT with amount ${mpt.tokenCount}`;
          },
     },
     unauthorizeMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.UNAUTHORIZE],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               unauthorizeMpt: { mptIssuanceId: mpt.mptIssuanceId },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptAuthorizeTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Unauthorizing MPT of ${mpt.mptIssuanceId}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Unauthorizing MPT with amount ${mpt.mptIssuanceId}`;
          },
     },
     authorizeMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.AUTHORIZE],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               authorizeMpt: { mptIssuanceId: mpt.mptIssuanceId },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptAuthorizeTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Authorizing MPT of ${mpt.mptIssuanceId}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Authorized MPT with amount ${mpt.mptIssuanceId}`;
          },
     },
     sendMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.SEND],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               sendMpt: { amount: mpt.amount, destination: mpt.destination, mptIssuanceId: mpt.mptIssuanceId },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptSendTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Sending MPT of ${mpt.amount}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Sent MPT with amount ${mpt.amount}`;
          },
     },
     lockMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.LOCK],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               lockMpt: { mptIssuanceId: mpt.mptIssuanceId, destination: mpt.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptLockTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Locking MPT of ${mpt.mptIssuanceId}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Locked MPT with amount ${mpt.mptIssuanceId}`;
          },
     },
     unlockMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.UNLOCK],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               unlockMpt: { mptIssuanceId: mpt.mptIssuanceId, destination: mpt.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptLockTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Unlocking MPT of ${mpt.mptIssuanceId} `,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Unlocked MPT with amount ${mpt.mptIssuanceId} `;
          },
     },
     clawbackMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.CLAWBACK],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               clawbackMpt: { amount: mpt.amount, mptIssuanceId: mpt.mptIssuanceId, destination: mpt.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptClawbackTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Clawback MPT of ${mpt.amount}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Clawbacked MPT with amount ${mpt.amount}`;
          },
     },
     destroyMpt: {
          validationRule: MPT_VALIDATION_RULES[MPT_TX_TYPES.DESTROY],
          buildValidationInputs: ({ wallet, env, mpt, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               destroyMpt: { amount: mpt.amount, mptIssuanceId: mpt.mptIssuanceId, destination: mpt.destination },
          }),
          buildTx: ({ orchestrator, env, wallet, mpt, txOptions }) => orchestrator.mptTransactionBuilderService.buildMptDestroyTransaction(env.wallet || wallet, env, mpt, txOptions),
          simulationToastMessage: ({ orchestrator, mpt }) => `Simulated Destroy MPT of ${mpt.amount}`,
          successMessage: ({ orchestrator, mpt }) => {
               return `Successfully Destroyed MPT with amount ${mpt.amount}`;
          },
     },
};

@Injectable({
     providedIn: 'root',
})
export class MptOrchestratorServiceService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly toastService = inject(ToastService);
     public readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptTransactionBuilderService = inject(MptTransactionBuilderService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);

     async executeMptTx(type: MptTxType, config: MptTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { mpt, account, txOptions, preFetchedEnv, wallet } = config;
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
               const meta = MPT_META[type];
               const validationInputs = meta.buildValidationInputs({ wallet, env, mpt, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, mpt, account, txOptions, type });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.mpt, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               //  Submit / simulate
               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,

                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                    skipBalanceCheck: true,

                    ui: {
                         suppressIndividualFeedback: false,
                    },

                    signing: {
                         useMultiSign: txOptions?.useMultiSign,
                         multiSignAddress: account?.multiSignAddress,
                         multiSignSeeds: account?.multiSignSeeds,
                         isRegularKeyAddress: txOptions?.isRegularKeyAddress,
                         regularKeySeed: account?.regularKeySeed,
                         regularKeyAddress: account?.regularKeyAddress,
                    },

                    buildTx: () => tx as any,
               });

               if (!submitOrSimResult.success) return { success: false, error: submitOrSimResult.error };

               txHash = submitOrSimResult.hash;

               // Simulated toast
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, mpt, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, mpt });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeCredentialTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: MptTxType, mpt: any, hash?: string) {
          const msg = MPT_META[type].simulationToastMessage({ orchestrator: this, mpt });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
