import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
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

@Injectable({ providedIn: 'root' })
export class CredentialTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     private readonly toastService = inject(ToastService);

     async executeCredentialTx(type: CredentialTxType, config: CredentialTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { wallet, simulate = false, multiSign = false, credentialType, expirationDate, uri, subject, credentialID, credentialIssuer, preFetchedEnv, extra = {} } = config;

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

               // Validation
               const validationRule = CREDENTIAL_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    multiSign,
                    credentialType,
                    expirationDate,
                    subject,
                    credentialID,
                    credentialIssuer,
                    uri,
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

               const preparedConfig = await this.prepareCredentialConfig(type, config, env);

               // Build transaction
               const tx = this.buildCredentialTransaction(type, env.wallet || wallet, env, preparedConfig, config, { simulate, multiSign, credentialType, expirationDate, subject, credentialID, credentialIssuer, uri, extra });

               // Optional fields
               await this.applyOptionalFields(client, tx, wallet, type, { simulate, multiSign, credentialType, expirationDate, subject, credentialID, credentialIssuer, uri, extra });

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, { simulate, multiSign, credentialType, expirationDate, subject, credentialID, credentialIssuer, uri, extra });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.handleSimulationSuccess(type, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.buildSuccessMessage(type, { simulate, multiSign, credentialType, expirationDate, subject, credentialID, credentialIssuer, uri, extra } as CredentialTxConfig);
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

     private buildValidationInputs(type: CredentialTxType, wallet: Wallet, env: any, values: any) {
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
               case 'createCredential':
                    return { ...base, createCredential: { credentialType: values.credentialType, expirationRipple: values.expirationDate, subject: values.subject } };
               case 'deleteCredentials':
                    return { ...base, deleteCredentials: { credentialType: values.credentialType, subject: values.subject, credentialID: values.credentialID } };
               case 'acceptCredentials':
                    return { ...base, acceptCredentials: { credentialType: values.credentialType, Issuer: values.credentialIssuer } };
          }
     }

     private buildCredentialTransaction(type: CredentialTxType, wallet: xrpl.Wallet, env: any, preparedConfig: any, config: any, values: any): xrpl.Transaction {
          const { fee } = env;
          switch (type) {
               case 'createCredential': {
                    const txCreate = this.xrplTransactionService.buildCreateCredentialTransaction(wallet, values.subject, values.credentialType, fee, env.ledgerInfo.lastIndex);
                    if (preparedConfig.expirationDate && config.expirationDate) txCreate.Expiration = Number.parseInt(preparedConfig.expirationDate);
                    return txCreate;
               }

               case 'deleteCredentials': {
                    const txDelete = this.xrplTransactionService.buildDeleteCredentialTransaction(wallet, values.subject, values.credentialType, fee, env.ledgerInfo.lastIndex);
                    if (preparedConfig.credentialIssuer) txDelete.Issuer = preparedConfig.credentialIssuer;
                    if (preparedConfig.subject) txDelete.Subject = preparedConfig.subject;
                    return txDelete;
               }

               case 'acceptCredentials':
                    return this.xrplTransactionService.buildAcceptCredentialTransaction(wallet, values.credentialIssuer, values.credentialType, fee, env.ledgerInfo.lastIndex);
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, type: CredentialTxType, values: any) {
          if (type === 'createCredential' && values.uri) this.utilsService.setURI(tx, values.uri);

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

     private async executeSpecificTx(type: CredentialTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, values: any) {
          const opts = {
               useMultiSign: values.multiSign,
               isRegularKeyAddress: values.isRegularKeyAddress,
               regularKeyAddress: values.regularKeyAddress,
               regularKeySeed: values.regularKeySeed,
               multiSignAddress: values.multiSignAddress,
               multiSignSeeds: values.multiSignSeeds,
          };

          switch (type) {
               case 'createCredential':
                    return this.executor.createCredential?.(tx as xrpl.CredentialCreate, wallet, client, opts);
               case 'deleteCredentials':
                    return this.executor.deleteCredential?.(tx as xrpl.CredentialDelete, wallet, client, opts);
               case 'acceptCredentials':
                    return this.executor.acceptCredential?.(tx as xrpl.CredentialAccept, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: CredentialTxType, config: CredentialTxConfig): string {
          const subjectShort = config.subject ? `${config.subject.slice(0, 8)}…` : '';
          switch (type) {
               case 'createCredential':
                    return `Successfully Create Credential for ${subjectShort}`;
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

     private async prepareCredentialConfig(type: CredentialTxType, config: CredentialTxConfig, env: any): Promise<CredentialTxConfig> {
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
