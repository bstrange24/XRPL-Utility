import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { PERMISSION_DOMAIN_VALIDATION_RULES } from '../../../components/permissioned-domain/constants/permissioned-domain.constants';
import { PermissionDomainConfig, PermissionDomainTxType } from '../../../components/permissioned-domain/constants/permissioned-domain.types';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { PermissionedDomainTransactionBuilderService } from '../permissioned-domain-transaction-builder/permissioned-domain-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly toastService = inject(ToastService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly permissionedDomainTransactionBuilderService = inject(PermissionedDomainTransactionBuilderService);

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
               const validationRule = PERMISSION_DOMAIN_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, permissionedDomain, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               let tx: any;
               if (type === 'setPermissionedDomain') {
                    tx = this.permissionedDomainTransactionBuilderService.buildSetPermissionedDomainTransaction(env.wallet || wallet, env, permissionedDomain);
               } else if (type === 'deletePermissionedDomain') {
                    tx = this.permissionedDomainTransactionBuilderService.buildDeletePermissionedDomainTransaction(env.wallet || wallet, env, permissionedDomain);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.permissionedDomain, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env, env.wallet || wallet, client, account, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(type, txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type);
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

     private buildValidationInputs(type: PermissionDomainTxType, wallet: Wallet, env: any, permissionDomain: any, account: any, txOptions: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
          };

          switch (type) {
               case 'setPermissionedDomain':
                    return { ...base, permissionedDomainSet: { credentialType: permissionDomain.credentialType, subject: permissionDomain.credentialIssuer } };
               case 'deletePermissionedDomain':
                    return { ...base, permissonedDomainDelete: { domainId: permissionDomain.selectedDomainId } };
          }
     }

     private async executeSpecificTx(type: PermissionDomainTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
          const opts = {
               useMultiSign: txOptions.useMultiSign,
               isRegularKeyAddress: txOptions.isRegularKeyAddress,
               isSimulateEnabled: txOptions.isSimulateEnabled,
               regularKeyAddress: account.regularKeyAddress,
               regularKeySeed: account.regularKeySeed,
               multiSignAddress: account.multiSignAddress,
               multiSignSeeds: account.multiSignSeeds,
          };

          switch (type) {
               case 'setPermissionedDomain':
                    return this.executor.permissionedDomainSet?.(tx as xrpl.PermissionedDomainSet, wallet, client, opts);
               case 'deletePermissionedDomain':
                    return this.executor.permissionedDomainDelete?.(tx as xrpl.PermissionedDomainDelete, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: PermissionDomainTxType): string {
          if (type === 'setPermissionedDomain') {
               return `Successfully Set Permission Domain`;
          }
          return `Successfully Deleted Permission Domain`;
     }

     handleSimulationSuccess(type: PermissionDomainTxType, hash?: any) {
          let msg: string;

          if (type === 'setPermissionedDomain') {
               msg = `Successfully simulated Setting Permission Domain`;
          } else {
               msg = `Successfully simulated Deleting Permission Domain`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
