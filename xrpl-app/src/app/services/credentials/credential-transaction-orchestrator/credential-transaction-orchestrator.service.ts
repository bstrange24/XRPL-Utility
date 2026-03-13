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
import { CREDENTIAL_VALIDATION_RULES, CredentialTxConfig, CredentialTxType } from '../../../components/credentials/constants/credential.constants';

@Injectable({ providedIn: 'root' })
export class CredentialTransactionOrchestratorService extends PerformanceBaseComponent {
     private readonly TxEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly xrplDateService = inject(XrplDateService);

     async executeCredentialTx(type: CredentialTxType, config: CredentialTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          console.log('config: ', config);
          const { wallet, simulate = false, multiSign = false, credentialType, expiration, uri, subject, credentialID, credentialIssuer, preFetchedEnv, extra = {} } = config;

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
                    env = await this.TxEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                    });
               }

               console.log('env: ', env);
               client = env.client;

               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               if (type === 'acceptCredentials' || type === 'deleteCredentials') {
                    const credentialID = config.credentialID;
                    if (!credentialID) {
                         return { success: false, error: 'Credential ID cannot be blank.', validationError: true };
                    }

                    const accountObjects = preFetchedEnv?.accountObjects?.result?.account_objects || [];
                    const credentialFound = accountObjects.find((line: any) => line.LedgerEntryType === 'Credential' && line.index === credentialID);

                    if (!credentialFound) {
                         return { success: false, error: 'Credential not found.', validationError: true };
                    }

                    if (type === 'acceptCredentials') {
                         if ((credentialFound as any)?.Flags === AppConstants.LSF_ACCEPTED) {
                              return { success: false, error: 'Credential has already been accepted.', validationError: true };
                         }

                         if (this.utilsService.isRippleExpired((credentialFound as any)?.Expiration)) {
                              return { success: false, error: 'Credential has expired.', validationError: true };
                         }

                         // Override subject & issuer from on-chain data
                         config.subject = credentialFound.Subject;
                         config.credentialIssuer = credentialFound.Issuer;
                         config.credentialType = credentialFound.CredentialType;
                    } else if (type === 'deleteCredentials') {
                         // override extra/credentialType if needed
                         config.credentialType = credentialFound.CredentialType;
                         config.subject = credentialFound.Subject;
                    }
               }

               if (type === 'createCredential' && expiration) {
                    const rippleTime = this.xrplDateService.toRippleTime(expiration);
                    if (rippleTime === undefined) {
                         return { success: false, error: 'Invalid expiration date format', validationError: true };
                    }
                    config.expiration = rippleTime.toString(); // Store as string for tx building
               }

               // Validation
               const validationRule = CREDENTIAL_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    multiSign,
                    credentialType,
                    expiration,
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

               // Build transaction
               const tx = this.buildCredentialTransaction(type, env.wallet || wallet, env, config, { simulate, multiSign, credentialType, expiration, subject, credentialID, credentialIssuer, uri, extra });

               // Optional fields
               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, { simulate, multiSign, credentialType, expiration, subject, credentialID, credentialIssuer, uri, extra }, env);

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, { simulate, multiSign, credentialType, expiration, subject, credentialID, credentialIssuer, uri, extra });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.credentialUtilService.handleSimulationSuccess(type, { simulate, multiSign, credentialType, expiration, subject, credentialID, credentialIssuer, uri, extra }, txHash, extra);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
               this.txUiService.setTxResultSignal(finalResult);

               const message = this.credentialUtilService.buildSuccessMessage(type, { simulate, multiSign, credentialType, expiration, subject, credentialID, credentialIssuer, uri, extra }, extra);
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
                    return { ...base, createCredential: { credentialType: values.credentialType, expirationRipple: values.expiration, subject: values.subject } };
               case 'deleteCredentials':
                    return { ...base, deleteCredentials: { credentialType: values.credentialType, subject: values.subject, credentialID: values.credentialID } };
               case 'acceptCredentials':
                    return { ...base, acceptCredentials: { credentialType: values.credentialType, Issuer: values.credentialIssuer } };
          }
     }

     private buildCredentialTransaction(type: CredentialTxType, wallet: xrpl.Wallet, env: any, config: any, values: any): xrpl.Transaction {
          const { fee } = env;
          switch (type) {
               case 'createCredential':
                    const txCreate = this.xrplTransactionService.buildCreateCredentialTransaction(wallet, values.subject, values.credentialType, fee, env.ledgerInfo.lastIndex);
                    if (values.expiration && config.expiration) txCreate.Expiration = Number.parseInt(config.expiration);
                    return txCreate;

               case 'deleteCredentials':
                    const txDelete = this.xrplTransactionService.buildDeleteCredentialTransaction(wallet, values.subject, values.credentialType, fee, env.ledgerInfo.lastIndex);
                    if (values.credentialIssuer) txDelete.Issuer = values.credentialIssuer;
                    if (values.subject) txDelete.Subject = values.subject;
                    return txDelete;

               case 'acceptCredentials':
                    return this.xrplTransactionService.buildAcceptCredentialTransaction(wallet, values.credentialIssuer, values.credentialType, fee, env.ledgerInfo.lastIndex);
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: CredentialTxType, values: any, env: any) {
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
}
