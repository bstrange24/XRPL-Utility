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
import { CredentialTransactionBuilderService } from '../credential-transaction-builder/credential-transaction-builder.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { CredentialState } from '../credential-store/credential-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CREDENTIAL_TX_TYPES, CREDENTIAL_VALIDATION_RULES, CredentialTxType } from '../../../components/credentials/constants/credential.constants';
import { CredentialTxConfig } from '../../../components/credentials/constants/credential.types';
import { AppConstants } from '../../../core/app.constants';

type CredentialTxMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; credential: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: CredentialTransactionOrchestratorService; env: any; wallet: any; credential: any; preparedConfig: CredentialState }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: CredentialTransactionOrchestratorService; credential: any }) => string;
     successMessage: (args: { orchestrator: CredentialTransactionOrchestratorService; credential: any }) => string;
};

const CREDENTIAL_META: Record<CredentialTxType, CredentialTxMeta> = {
     createCredential: {
          validationRule: CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.CREATE],
          buildValidationInputs: ({ wallet, env, credential, account, txOptions }) => ({
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
               createCredential: {
                    credentialType: credential.credentialType,
                    expirationRipple: credential.expirationDate,
                    subject: credential.subject,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, credential, preparedConfig }) => orchestrator.credentialTransactionBuilderService.buildCreateCredentialTx(env.wallet || wallet, env, credential, preparedConfig),
          simulationToastMessage: () => `Simulated Creating Credential`,
          successMessage: ({ credential }) => `Successfully Created Credential${credential.subject ? ` for ${credential.subject}` : ''}`,
     },

     acceptCredentials: {
          validationRule: CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.ACCEPT],
          buildValidationInputs: ({ wallet, env, credential, account, txOptions }) => ({
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
               acceptCredentials: {
                    credentialID: credential.credentialID,
                    credentialIssuer: credential.credentialIssuer,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, credential, preparedConfig }) => orchestrator.credentialTransactionBuilderService.buildAcceptCredentialTx(env.wallet || wallet, env, credential, preparedConfig),
          simulationToastMessage: () => `Simulated Accepting Credential`,
          successMessage: () => `Successfully Accepted Credential`,
     },

     deleteCredentials: {
          validationRule: CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.DELETE],
          buildValidationInputs: ({ wallet, env, credential, account, txOptions }) => ({
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
               deleteCredentials: {
                    credentialType: credential.credentialType,
                    subject: credential.subject,
                    credentialID: credential.credentialID,
               },
          }),
          buildTx: ({ orchestrator, env, wallet, credential }) => orchestrator.credentialTransactionBuilderService.buildDeleteCredentialTx(env.wallet || wallet, env, credential),
          simulationToastMessage: () => `Simulated Deleting Credential`,
          successMessage: () => `Successfully Deleted Credential`,
     },
};

@Injectable({ providedIn: 'root' })
export class CredentialTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly credentialTransactionBuilderService = inject(CredentialTransactionBuilderService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly toastService = inject(ToastService);
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
               const meta = CREDENTIAL_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, credential, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Prepare config (enrich from ledger + date conversion)
               const preparedConfig = await this.prepareCredentialConfig(type, credential, env);

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, credential, preparedConfig });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.credential, type, txOptions);

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
                    return this.handleSimulationSuccess(type, credential, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, credential });
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

     handleSimulationSuccess(type: CredentialTxType, credential: any, hash?: string) {
          const msg = CREDENTIAL_META[type].simulationToastMessage({ orchestrator: this, credential });

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
