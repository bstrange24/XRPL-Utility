import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TxEnvironmentServiceService } from '../../transaction-environment/tx-environment-service.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { ToastService } from '../../toast/toast.service';
import { UtilsService } from '../../util-service/utils.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';

@Injectable({ providedIn: 'root' })
export class CheckTransactionService {
     private readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly validationService = inject(ValidationService);
     public readonly toastService = inject(ToastService);
     public readonly utilsService = inject(UtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly txEnvironmentServiceService = inject(TxEnvironmentServiceService);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);

     async createCheck(params: { wallet: any; destination: string; amount: string; currencyValue: string; issuer?: string; isSimulate: boolean; useMultiSign: boolean; isRegularKey: boolean; regularKeyAddress: string; regularKeySeed: string; multiSignAddress: string; multiSignSeeds: string }) {
          const { wallet, destination, amount, currencyValue, issuer, isSimulate, useMultiSign, isRegularKey, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds } = params;

          this.txUiService.clearAllOptionsAndMessages();
          this.txUiService.resetCurrentStepToIdle();

          if (isSimulate) this.txUiService.currentStep.set('preparing');

          try {
               const env = await this.txEnvironmentServiceService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerIndex: true,
                    includeDestinationAccountInfo: true,
                    destinationAddress: destination,
               });

               if (!env.accountInfo || !env.accountObjects || !env.destinationAccountInfo) {
                    throw new Error('Failed to fetch account information');
               }

               if (env.destinationAccountInfo?.result?.account_flags?.disallowIncomingCheck) {
                    this.toastService.error(`Destination ${destination} has disallowIncomingCheck enabled.`);
                    return;
               }

               const inputs = this.txUiService.getValidationInputs({
                    wallet,
                    network: { accountInfo: env.accountInfo, accountObjects: env.accountObjects, fee: env.fee, currentLedger: env.currentLedger },
                    createCheck: { amount, destination },
                    regularKey: { isRegularKey, address: regularKeyAddress, seed: regularKeySeed },
               });

               const errors = await this.validationService.validate('CreateCheck', { inputs, client: env.client, accountInfo: env.accountInfo });
               if (errors.length) {
                    this.toastService.error(errors.join('\n• '));
                    return;
               }

               const sendMax = this.xrplTransactionService.buildSendMaxAmount(currencyValue, issuer || '', false).sendMax;

               let tx: xrpl.CheckCreate = this.xrplTransactionService.buildCreateCheckTransaction(wallet, sendMax, destination, env.fee!, env.currentLedger!);

               // Set optional fields (move this logic to a shared method if needed)
               // await this.transactionOptionalFieldsService.setTxOptionalFields(env.client, tx, wallet, env.accountInfo, 'create');

               const result = await this.txExecutor.checkCreate(tx, wallet, env.client, {
                    destination,
                    paymentType: 'unknown', // fill from buildSendMaxAmount if needed
                    amount,
                    useMultiSign,
                    isRegularKeyAddress: isRegularKey,
                    regularKeyAddress,
                    regularKeySeed,
                    multiSignAddress,
                    multiSignSeeds,
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to submit');
                    return;
               }

               const shortDest = destination.slice(0, 7) + '…' + destination.slice(-7);
               if (isSimulate) {
                    this.txUiService.resetCurrentStepToIdle();
                    this.toastService.success(`Simulated Sending Check of ${amount} to ${shortDest}`);
                    return;
               }

               // Wait for final outcome, process result, toast, etc.
               // ... (similar to your original)

               // await refreshAfterTx(...);
          } catch (err: any) {
               throw new Error();
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     // Similar methods for cashCheck and cancelCheck...
}
