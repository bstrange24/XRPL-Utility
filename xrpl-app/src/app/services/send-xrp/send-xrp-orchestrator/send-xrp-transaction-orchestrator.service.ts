import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { XrpPaymentConfig } from '../../../components/send-xrp/constants/send-xrp.types';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SEND_XRP_VALIDATION_RULES, SendXrpTxType } from '../../../components/send-xrp/constants/send-xrp.constants';
import { SendXrpTransactionBuilderService } from '../send-xrp-transaction-builder/send-xrp-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class SendXrpTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly toastService = inject(ToastService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly sendXrpTransactionBuilderService = inject(SendXrpTransactionBuilderService);

     async executeXrpPayment(type: SendXrpTxType, config: XrpPaymentConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
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
               const validationRule = SEND_XRP_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(wallet, env, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               const tx = this.sendXrpTransactionBuilderService.buildSendXrpTransaction(env.wallet || wallet, env, account);

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.account, type, txOptions);

               // Check balances
               const isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Execute
               const execResult = await this.executeSpecificTx(tx, env, env.wallet || wallet, client, account, txOptions);
               if (!execResult.success) return { success: false, error: execResult.error };
               txHash = execResult.hash;

               if (txOptions?.isSimulateEnabled) return this.handleSimulationSuccess(txHash);

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage();
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeXrpPayment failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private buildValidationInputs(wallet: Wallet, env: any, account: any, txOptions: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.ledgerInfo.lastIndex },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
          };
          return { ...base, paymentXrp: { amount: account.amount, destination: account.destination } };
     }

     private async executeSpecificTx(tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
          const opts = {
               useMultiSign: txOptions.useMultiSign,
               isRegularKeyAddress: txOptions.isRegularKeyAddress,
               isSimulateEnabled: txOptions.isSimulateEnabled,
               regularKeyAddress: account.regularKeyAddress,
               regularKeySeed: account.regularKeySeed,
               multiSignAddress: account.multiSignAddress,
               multiSignSeeds: account.multiSignSeeds,
          };
          return this.executor.sendXrpPayment?.(env, tx as xrpl.Payment, wallet, client, opts);
     }

     buildSuccessMessage(): string {
          return `Successfully Set XRP`;
     }

     handleSimulationSuccess(hash?: any) {
          const msg = `Successfully simulated Sending XRP`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
