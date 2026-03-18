import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { AppConstants } from '../../../core/app.constants';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CREDENTIAL_VALIDATION_RULES, CredentialTxType } from '../../../components/credentials/constants/credential.constants';
import { CredentialTxConfig } from '../../../components/credentials/constants/credential.types';
import { ToastService } from '../../toast/toast.service';
import { CredentialState } from '../credential-store/credential-store.service';
import { CredentialTransactionBuilderService } from '../credential-transaction-builder/credential-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';

@Injectable({
     providedIn: 'root',
})
export class CredentialTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly toastService = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly credentialTransactionBuilderService = inject(CredentialTransactionBuilderService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);

     async executeCredentialTx(type: CredentialTxType, config: CredentialTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { credential, account, txOptions, preFetchedEnv, wallet } = config;
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
                         includeServerInfo: true,
                    });
               }

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const validationRule = CREDENTIAL_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, credential, account, txOptions);
               const errors = await this.validator.validate(validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const preparedConfig = await this.prepareCredentialConfig(type, credential, env);

               let tx: any;
               if (type === 'createCredential') {
                    tx = this.credentialTransactionBuilderService.buildCreateCredentialTx(env.wallet || wallet, env, credential, preparedConfig);
               } else if (type === 'acceptCredentials') {
                    tx = this.credentialTransactionBuilderService.buildAcceptCredentialTx(env.wallet || wallet, env, credential, preparedConfig);
               } else {
                    tx = this.credentialTransactionBuilderService.buildDeleteCredentialTx(env.wallet || wallet, env, credential);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.credential, type, txOptions);

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

               const message = this.buildSuccessMessage(type, credential);
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

     private buildValidationInputs(type: CredentialTxType, wallet: Wallet, env: any, credential: any, account: any, txOptions: any) {
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
               case 'createCredential':
                    return { ...base, createCredential: { credentialType: credential.credentialType, expirationRipple: credential.expirationDate, subject: credential.subject } };
               case 'deleteCredentials':
                    return { ...base, deleteCredentials: { credentialType: credential.credentialType, subject: credential.subject, credentialID: credential.credentialID } };
               case 'acceptCredentials':
                    return { ...base, acceptCredentials: { credentialID: credential.credentialID, credentialIssuer: credential.credentialIssuer } };
          }
     }

     private async executeSpecificTx(type: CredentialTxType, tx: xrpl.Transaction, env: any, wallet: xrpl.Wallet, client: xrpl.Client, account: any, txOptions: any) {
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
               case 'createCredential':
                    return this.executor.createCredential?.(env, tx as xrpl.CredentialCreate, wallet, client, opts);
               case 'deleteCredentials':
                    return this.executor.deleteCredential?.(env, tx as xrpl.CredentialDelete, wallet, client, opts);
               case 'acceptCredentials':
                    return this.executor.acceptCredential?.(env, tx as xrpl.CredentialAccept, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: CredentialTxType, config: CredentialState): string {
          switch (type) {
               case 'createCredential':
                    return `Successfully Create Credential for ${config.subject ? config.subject : ''}`;
               case 'acceptCredentials':
                    return `Successfully Accepted Credential`;
               case 'deleteCredentials':
                    return `Successfully Deleted Credential`;
               default:
                    return 'Operation completed';
          }
     }

     handleSimulationSuccess(type: CredentialTxType, hash?: string) {
          let msg: string;

          if (type === 'createCredential') msg = `Successfully simulated creating the Credential.`;
          else if (type === 'deleteCredentials') msg = `Successfully simulated deleting the Credential.`;
          else msg = `Successfully simulated accepting the Credential.`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     private async prepareCredentialConfig(type: CredentialTxType, config: CredentialState, env: any): Promise<CredentialState> {
          const mutable = { ...config };

          if ((type === 'acceptCredentials' || type === 'deleteCredentials') && mutable.credentialID) {
               const cred = env.accountObjects?.result?.account_objects?.find((o: any) => o.LedgerEntryType === 'Credential' && o.index === mutable.credentialID);
               if (cred) {
                    mutable.subject = cred.Subject;
                    mutable.credentialIssuer = cred.Issuer;
                    mutable.credentialType = cred.CredentialType;
               }
          }

          if (type === 'createCredential' && mutable.expirationDate) {
               const rt = this.xrplDateService.toRippleTime(mutable.expirationDate);
               if (rt !== undefined) mutable.expirationDate = rt.toString();
          }

          return mutable;
     }
}
