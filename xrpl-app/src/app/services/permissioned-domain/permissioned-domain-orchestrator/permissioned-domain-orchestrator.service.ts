import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { PermissionedDomainTransactionBuilderService } from '../permissioned-domain-transaction-builder/permissioned-domain-transaction-builder.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { PERMISSION_DOMAIN_TX_TYPES, PERMISSION_DOMAIN_VALIDATION_RULES } from '../../../components/permissioned-domain/constants/permissioned-domain.constants';
import { PermissionDomainConfig, PermissionDomainTxType } from '../../../components/permissioned-domain/constants/permissioned-domain.types';
import { AppConstants } from '../../../core/app.constants';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

type PermissionDomainMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; permissionedDomain: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: PermissionedDomainOrchestratorService; env: any; wallet: any; permissionedDomain: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: PermissionedDomainOrchestratorService; permissionedDomain: any }) => string;
     successMessage: (args: { orchestrator: PermissionedDomainOrchestratorService; permissionedDomain: any }) => string;
};

const PERMISSION_DOMAIN_META: Record<PermissionDomainTxType, PermissionDomainMeta> = {
     setPermissionedDomain: {
          validationRule: PERMISSION_DOMAIN_VALIDATION_RULES[PERMISSION_DOMAIN_TX_TYPES.SET],
          buildValidationInputs: ({ wallet, env, permissionedDomain, account, txOptions }) => ({
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
               permissionedDomainSet: { setAcceptedCredentials: permissionedDomain.setAcceptedCredentials },
          }),
          buildTx: ({ orchestrator, env, wallet, permissionedDomain }) => orchestrator.permissionedDomainTransactionBuilderService.buildSetPermissionedDomainTransaction(env.wallet || wallet, env, permissionedDomain),
          simulationToastMessage: () => `Simulated Setting Permission Domain`,
          successMessage: () => `Successfully Set Permission Domain`,
     },

     deletePermissionedDomain: {
          validationRule: PERMISSION_DOMAIN_VALIDATION_RULES[PERMISSION_DOMAIN_TX_TYPES.DELETE],
          buildValidationInputs: ({ wallet, env, permissionedDomain, account, txOptions }) => ({
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
               permissonedDomainDelete: { domainId: permissionedDomain.selectedDomainId },
          }),
          buildTx: ({ orchestrator, env, wallet, permissionedDomain }) => orchestrator.permissionedDomainTransactionBuilderService.buildDeletePermissionedDomainTransaction(env.wallet || wallet, env, permissionedDomain),
          simulationToastMessage: () => `Simulated Deleting Permission Domain`,
          successMessage: () => `Successfully Deleted Permission Domain`,
     },
};

@Injectable({ providedIn: 'root' })
export class PermissionedDomainOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly permissionedDomainTransactionBuilderService = inject(PermissionedDomainTransactionBuilderService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly toastService = inject(ToastService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executePermissionDomainTx(type: PermissionDomainTxType, config: PermissionDomainConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { permissionedDomain, account, txOptions, preFetchedEnv, wallet } = config;
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
               const meta = PERMISSION_DOMAIN_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, permissionedDomain, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, permissionedDomain });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.permissionedDomain, type, txOptions);

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
                    return this.handleSimulationSuccess(type, permissionedDomain, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, permissionedDomain });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executePermissionDomainTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: PermissionDomainTxType, permissionedDomain: any, hash?: string) {
          const msg = PERMISSION_DOMAIN_META[type].simulationToastMessage({ orchestrator: this, permissionedDomain });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
