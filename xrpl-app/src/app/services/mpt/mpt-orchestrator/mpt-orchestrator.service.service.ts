import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { AppConstants } from '../../../core/app.constants';
import { MptUtilService } from '../mpt-util/mpt-util.service';
import { MPTAmount } from '../../../models/interface-items.model';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

type MptTxType = 'create' | 'authorize' | 'unauthorize' | 'send' | 'lock' | 'unlock' | 'clawback' | 'destroy';

interface MptTxConfig {
     wallet: Wallet;
     formValues: {
          amount?: string;
          tokenCountField?: number;
          assetScaleField?: number;
          transferFeeField?: number;
          destinationAddress?: string;
          authorize?: string;
          locked?: string;
          issuer?: string;
          isSimulate?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string | string[];
          [key: string]: any;
     };
     extra?: {
          expiration?: string; // for create
          enableExpirationDate?: boolean;
          [key: string]: any;
     };
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          destinationAddress?: any;
          wallet: any;
          // add more fields if needed later
     };
}

@Injectable({
     providedIn: 'root',
})
export class MptOrchestratorServiceService extends PerformanceBaseComponent {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly executor = inject(XrplTransactionExecutorService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly optionalFields = inject(TransactionOptionalFieldsService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     async executeMptTx(type: MptTxType, config: MptTxConfig): Promise<{ success: boolean; hash?: string; error?: string }> {
          const { wallet, formValues, extra = {}, preFetchedEnv } = config;
          const { isSimulate = false } = formValues;

          let client: xrpl.Client;
          let env: any;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (preFetchedEnv) {
                    env = preFetchedEnv;
                    client = preFetchedEnv.client;

                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Pre-fetched environment missing required fields');
                    }
               } else {
                    // Normal fetch for fallback
                    const envFlags: any = {
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    };
                    if (formValues.destinationAddress) {
                         envFlags.includeDestinationAccountInfo = true;
                         envFlags.destinationAddress = formValues.destinationAddress;
                    }
                    const env = await this.txEnvironmentService.prepareTxEnvironment(envFlags);
                    client = env.client;
                    if (!env.accountInfo || !env.fee || !env.currentLedger) {
                         throw new Error('Failed to fetch required network data');
                    }
               }

               const validationInputs = this.buildValidationInputs(type, wallet, env, formValues, extra);
               const errors = await this.validator.validate(this.getValidationRuleName(type), {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });

               if (errors.length > 0) {
                    return { success: false, error: errors.join('\n• ') };
               }

               const tx = this.buildCheckTransaction(type, env.wallet, env, formValues, extra);

               await this.applyOptionalFields(client, tx, env.wallet, env.accountInfo, type, extra);

               const execResult = await this.executeSpecificTx(type, tx, env.wallet, client, formValues);

               if (!execResult.success) {
                    return { success: false, error: execResult.error };
               }

               txHash = execResult.hash;

               if (isSimulate) {
                    return this.handleSimulationSuccess(type, formValues, txHash);
               }

               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, tx.LastLedgerSequence!);

               this.txUiService.setTxResultSignal(finalResult);
               this.xrplTransactionService.processTxFinalResult(finalResult, this.buildSuccessMessage(type, formValues), { success: true, hash: txHash });
               return { success: true, hash: txHash };
          } catch (err: any) {
               const msg = err.message || 'Unexpected error during check transaction';
               console.error(`[${type}] executeCheckTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: msg };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
               // Note: Do **not** refresh here — let the component decide when/how
          }
     }

     private getValidationRuleName(type: MptTxType): string {
          const ruleMap: Record<MptTxType, string> = {
               create: 'MptCreate',
               authorize: 'MptAuthorize',
               unauthorize: 'MptUnauthorize',
               send: 'MptSend',
               lock: 'MptLock',
               unlock: 'MptUnlock',
               clawback: 'MptClawback',
               destroy: 'MptDestroy',
          };

          return ruleMap[type];
     }

     private buildValidationInputs(type: MptTxType, wallet: Wallet, env: any, formValues: any, extra: any) {
          const base = {
               wallet,
               network: { accountInfo: env.accountInfo, fee: env.fee, currentLedger: env.currentLedger },
               regularKey: {
                    isRegularKey: formValues.isRegularKeyAddress,
                    address: formValues.regularKeyAddress,
                    seed: formValues.regularKeySeed,
               },
          };

          if (type === 'create') {
               return {
                    ...base,
                    createMpt: {
                         tokenCountField: formValues.tokenCountField,
                         assetScaleField: formValues.assetScaleField,
                         transferFeeField: formValues.transferFeeField,
                    },
               };
          }

          if (type === 'authorize') {
               return {
                    ...base,
                    authorizeMpt: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                    },
               };
          }

          if (type === 'unauthorize') {
               return {
                    ...base,
                    unauthorize: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                    },
               };
          }

          if (type === 'send') {
               return {
                    ...base,
                    send: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                         destinationAddress: formValues.destinationAddress,
                         amount: formValues.amount,
                    },
               };
          }

          if (type === 'lock') {
               return {
                    ...base,
                    lock: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                    },
               };
          }

          if (type === 'unlock') {
               return {
                    ...base,
                    unlock: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                    },
               };
          }

          if (type === 'clawback') {
               return {
                    ...base,
                    clawback: {
                         mptIssuanceIdField: formValues.mptIssuanceIdField,
                         destinationAddress: formValues.destinationAddress,
                         amount: formValues.amount,
                    },
               };
          }

          return {
               ...base,
               destroy: {
                    mptIssuanceIdField: formValues.mptIssuanceIdField,
               },
          };
     }

     private buildCheckTransaction(type: MptTxType, wallet: xrpl.Wallet, env: any, formValues: any, extra: any): xrpl.Transaction {
          const { fee, currentLedger } = env;

          if (type === 'create') {
               const tx: xrpl.MPTokenIssuanceCreate = this.xrplTransactionService.buildMptCreateTransaction(wallet, fee, currentLedger, formValues);

               if (formValues.flags) {
                    tx.Flags = formValues.flags;
               }

               return tx;
          }

          if (type === 'authorize' || type === 'unauthorize') {
               const tx: xrpl.MPTokenAuthorize = this.xrplTransactionService.buildMptAuthorizeTransaction(wallet, fee, currentLedger, formValues);

               if (type === 'unauthorize') tx.Flags = xrpl.MPTokenAuthorizeFlags.tfMPTUnauthorize;

               return tx;
          }

          if (type === 'send') {
               const tx: xrpl.Payment = this.xrplTransactionService.buildMptSendTransaction(wallet, fee, currentLedger, formValues);
               return tx;
          }

          if (type === 'lock' || type === 'unlock') {
               const tx: xrpl.MPTokenIssuanceSet = this.xrplTransactionService.buildMptLockTransaction(wallet, fee, currentLedger, formValues);

               tx.Flags = type === 'lock' ? xrpl.MPTokenIssuanceSetFlags.tfMPTLock : xrpl.MPTokenIssuanceSetFlags.tfMPTUnlock;

               return tx;
          }

          if (type === 'clawback') {
               const tx: xrpl.Clawback = this.xrplTransactionService.buildMptClawbackTransaction(wallet, fee, currentLedger, formValues);

               const amount: MPTAmount = {
                    value: this.txUiService.amountField(),
                    mpt_issuance_id: this.txUiService.mptIssuanceIdField(),
               };
               tx.Amount = amount;

               return tx;
          }

          // destroy
          return this.xrplTransactionService.buildMptDestroyTransaction(wallet, fee, currentLedger, formValues);
     }

     private async applyOptionalFields(client: xrpl.Client, mptTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string, extra: any) {
          if (txType === 'create') {
               this.setCreateTxOptionalFields(mptTx, extra);
          }

          const isTicket = extra.isTicket;
          if (isTicket) {
               // const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(mptTx, ticket, true);
               }
          }

          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(mptTx, memoField);
          }

          const invoiceIdField = this.txUiService.invoiceIdField();
          if (invoiceIdField) {
               this.utilsService.setInvoiceIdField(mptTx, invoiceIdField);
          }

          const sourceTagField = this.txUiService.sourceTagField();
          if (sourceTagField) {
               this.utilsService.setSourceTagField(mptTx, sourceTagField);
          }

          const destinationTagField = this.txUiService.destinationTagField();
          if (destinationTagField) {
               this.utilsService.setDestinationTag(mptTx, destinationTagField);
          }
     }

     private setCreateTxOptionalFields(mptTx: any, extra: any) {
          if (this.txUiService.assetScaleField()) {
               const assetScale = this.txUiService.assetScaleField();
               if (assetScale < 0 || assetScale > 15) {
                    throw new Error('Tick size must be between 3 and 15.');
               }
               mptTx.AssetScale = assetScale;
          }

          if (this.mptUtilService.flags.canTransfer) {
               if (!this.txUiService.transferFeeField() && this.mptUtilService.flags.canTransfer) {
                    throw new Error('Transfer Fee is required when CanTransfer is enabled');
               }
               if (this.txUiService.transferFeeField()) {
                    // TransferFee is in 1/1000th of a percent (basis points / 10), so for 1%, input 1000
                    const transferFee = this.txUiService.transferFeeField();
                    if (Number.isNaN(transferFee) || transferFee < 0 || transferFee > 50000) {
                         throw new Error('Transfer Fee must be a number between 0 and 50,000 (for 0% to 50%).');
                    }
                    mptTx.TransferFee = transferFee;
               }
          }

          if (this.txUiService.metaDataField()) {
               mptTx.MPTokenMetadata = xrpl.convertStringToHex(this.txUiService.metaDataField());
          }
     }

     private async executeSpecificTx(type: MptTxType, tx: xrpl.Transaction, wallet: xrpl.Wallet, client: xrpl.Client, formValues: any) {
          if (type === 'create') {
               return this.executor.mptCreate(tx as xrpl.MPTokenIssuanceCreate, wallet, client, {
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'authorize' || type === 'unauthorize') {
               return this.executor.mptAuthUnauth(tx as xrpl.MPTokenAuthorize, wallet, client, {
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'send') {
               return this.executor.mptSend(tx as xrpl.Payment, wallet, client, {
                    useMultiSign: formValues.useMultiSign,
                    isRegularKeyAddress: formValues.isRegularKeyAddress,
                    regularKeyAddress: formValues.regularKeyAddress,
                    regularKeySeed: formValues.regularKeySeed,
                    multiSignAddress: formValues.multiSignAddress,
                    multiSignSeeds: formValues.multiSignSeeds,
               });
          }

          if (type === 'lock' || type === 'unlock') {
               return this.executor.mptLockUnlock(tx as xrpl.MPTokenIssuanceSet, wallet, client, {
                    useMultiSign: this.xrplTxOptionsStore.useMultiSign(),
                    isRegularKeyAddress: this.accountConfiguratorStoreService.isRegularKeyAddress(),
                    // isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                    regularKeyAddress: this.txUiService.regularKeyAddress(),
                    regularKeySeed: this.txUiService.regularKeySeed(),
                    multiSignAddress: this.txUiService.multiSignAddress(),
                    multiSignSeeds: this.txUiService.multiSignSeeds(),
               });
          }

          if (type === 'clawback') {
               return this.executor.mptClawback(tx as xrpl.Clawback, wallet, client, {
                    useMultiSign: this.xrplTxOptionsStore.useMultiSign(),
                    isRegularKeyAddress: this.accountConfiguratorStoreService.isRegularKeyAddress(),
                    // isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                    regularKeyAddress: this.txUiService.regularKeyAddress(),
                    regularKeySeed: this.txUiService.regularKeySeed(),
                    multiSignAddress: this.txUiService.multiSignAddress(),
                    multiSignSeeds: this.txUiService.multiSignSeeds(),
               });
          }

          // destroy
          return this.executor.mptDestroy(tx as xrpl.MPTokenIssuanceDestroy, wallet, client, {
               useMultiSign: formValues.useMultiSign,
               isRegularKeyAddress: formValues.isRegularKeyAddress,
               regularKeyAddress: formValues.regularKeyAddress,
               regularKeySeed: formValues.regularKeySeed,
               multiSignAddress: formValues.multiSignAddress,
               multiSignSeeds: formValues.multiSignSeeds,
          });
     }

     private handleSimulationSuccess(type: MptTxType, formValues: any, hash?: string) {
          let msg: string;

          if (type === 'create') {
               msg = `Simulated Create MPT successfully`;
          } else if (type === 'authorize') {
               msg = `Simulated MPT Authorized successfully`;
          } else if (type === 'unauthorize') {
               msg = `Simulated MPT Unauthorized successfully`;
          } else if (type === 'send') {
               msg = `Simulated MPT sent successfully`;
          } else if (type === 'lock') {
               msg = `Simulated MPT Lock successfully`;
          } else if (type === 'unlock') {
               msg = `Simulated MPT Unlock successfully`;
          } else if (type === 'clawback') {
               msg = `Simulated MPT clawback successfully`;
          } else {
               msg = `Simulated MPT destroy successfully`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toast.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     private buildSuccessMessage(type: MptTxType, formValues: any): string {
          if (type === 'create') {
               return `MPT Created successfully`;
          } else if (type === 'authorize') {
               return `MPT Authorized successfully`;
          } else if (type === 'unauthorize') {
               return `MPT Unauthorized successfully`;
          } else if (type === 'send') {
               return `MPT Sent successfully`;
          } else if (type === 'lock') {
               return `MPT Lock successfully`;
          } else if (type === 'unlock') {
               return `MPT Unlock successfully`;
          } else if (type === 'clawback') {
               return `MPT Clawback successfully`;
          } else {
               return `MPT Destroy successfully`;
          }
     }
}
