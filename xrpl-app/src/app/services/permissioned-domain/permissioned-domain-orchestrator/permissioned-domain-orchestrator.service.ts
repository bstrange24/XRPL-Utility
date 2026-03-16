import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';
import { PERMISSION_DOMAIN_VALIDATION_RULES } from '../../../components/permissioned-domain/constants/permissioned-domain.constants';
import { PermissionDomainConfig, PermissionDomainTxType } from '../../../components/permissioned-domain/constants/permissioned-domain.types';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly toastService = inject(ToastService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     async executePermissionDomainTx(type: PermissionDomainTxType, config: PermissionDomainConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean }> {
          const { wallet, simulate = false, multiSign = false, credentialType, credentialIssuer, domainId, subjectDestination, preFetchedEnv, extra = {} } = config;

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
               const validationRule = PERMISSION_DOMAIN_VALIDATION_RULES[type];
               const validationInputs = this.buildValidationInputs(type, wallet, env, {
                    simulate,
                    multiSign,
                    credentialType,
                    credentialIssuer,
                    domainId,
                    subjectDestination,
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
               const tx = this.buildPermissionedDomainTransaction(type, env.wallet || wallet, env, config, { simulate, multiSign, credentialType, credentialIssuer, domainId, subjectDestination, extra });

               // Optional fields
               await this.applyOptionalFields(client, tx, wallet, env.accountInfo, type, { simulate, multiSign, credentialType, credentialIssuer, domainId, subjectDestination, extra }, env);

               // Execute
               const execResult = await this.executeSpecificTx(type, tx, env.wallet || wallet, client, { simulate, multiSign, credentialType, credentialIssuer, domainId, subjectDestination, extra });

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (simulate) {
                    return this.handleSimulationSuccess(type, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);
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

     private buildValidationInputs(type: PermissionDomainTxType, wallet: Wallet, env: any, values: any) {
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
               case 'setDomain':
                    return { ...base, permissionedDomainSet: { credentialType: values.credentialType, subject: values.credentialIssuer } };
               case 'deleteDomain':
                    return { ...base, permissonedDomainDelete: { domainId: values.domainId } };
          }
     }

     private buildPermissionedDomainTransaction(type: PermissionDomainTxType, wallet: xrpl.Wallet, env: any, config: any, values: any): xrpl.Transaction {
          const { fee } = env;

          switch (type) {
               case 'setDomain': {
                    const txCreate = this.xrplTransactionService.buildPermissionedDomainSetTransaction(wallet, values.credentialIssuer, values.credentialType, fee, env.ledgerInfo.lastIndex);
                    return txCreate;
               }

               case 'deleteDomain': {
                    const txDelete = this.xrplTransactionService.buildPermissionedDomainDeleteTransaction(wallet, values.domainId, fee, env.ledgerInfo.lastIndex);
                    return txDelete;
               }
          }
     }

     private async applyOptionalFields(client: xrpl.Client, tx: xrpl.Transaction, wallet: Wallet, accountInfo: any, type: PermissionDomainTxType, values: any, env: any) {
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

          if (this.txUiService.wantsOptions()) {
               const domainId = this.xrplTxOptionsStore.domainId();
               const domainID = this.utilsService.toDomainId(domainId);
               if (domainId) this.utilsService.setDomainId(tx, domainID);
          }
     }

     private async executeSpecificTx(type: PermissionDomainTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, values: any) {
          const opts = {
               useMultiSign: values.multiSign,
               isRegularKeyAddress: values.isRegularKeyAddress,
               regularKeyAddress: values.regularKeyAddress,
               regularKeySeed: values.regularKeySeed,
               multiSignAddress: values.multiSignAddress,
               multiSignSeeds: values.multiSignSeeds,
          };

          switch (type) {
               case 'setDomain':
                    return this.executor.permissionedDomainSet?.(tx as xrpl.PermissionedDomainSet, wallet, client, opts);
               case 'deleteDomain':
                    return this.executor.permissionedDomainDelete?.(tx as xrpl.PermissionedDomainDelete, wallet, client, opts);
          }
     }

     buildSuccessMessage(type: PermissionDomainTxType): string {
          if (type === 'setDomain') {
               return `Successfully Set Permission Domain`;
          }
          return `Successfully Deleted Permission Domain`;
     }

     handleSimulationSuccess(type: PermissionDomainTxType, hash?: any) {
          let msg: string;

          if (type === 'setDomain') {
               msg = `Successfully simulated Setting Permission Domain`;
          } else {
               msg = `Successfully simulated Deleting Permission Domain`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
