import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../utils/util-service/utils.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../utils/toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { PaymentChannelUtilService } from '../payment-channel/payment-channel-util/payment-channel-util.service';
import { CredentialStore } from '../credentials/credential-store/credential-store.service';
import { Wallet } from '../wallets/manager/wallet-manager.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { MptStoreService } from '../mpt/mpt-store/mpt-store.service';

@Injectable({
     providedIn: 'root',
})
export class XrplTransactionService extends PerformanceBaseComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly utilsService = inject(UtilsService);
     private readonly toastService = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly mptStoreService = inject(MptStoreService);
     private readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     private readonly credentialStore = inject(CredentialStore);

     // HELPER: Sign transaction (handles both single and multi-sign)
     async signTransaction(client: any, wallet: xrpl.Wallet, tx: any, useRegularKeyWalletSignTx: boolean, regularKeyWalletSignTx: any, fee: string, useMultiSign: boolean, multiSignAddress: any, multiSignSeeds: any): Promise<{ tx_blob: string; hash: string } | null> {
          if (useMultiSign) {
               const signerAddresses = this.utilsService.getMultiSignAddress(multiSignAddress);
               const signerSeeds = this.utilsService.getMultiSignSeeds(multiSignSeeds);

               if (signerAddresses.length === 0) {
                    throw new Error('No signer addresses provided for multi-signing');
               }
               if (signerSeeds.length === 0) {
                    throw new Error('No signer seeds provided for multi-signing');
               }

               const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: tx, signerAddresses, signerSeeds, fee });

               tx.Signers = result.signers;

               // Recalculate fee for multisign
               const multiSignFee = String((signerAddresses.length + 1) * Number(fee));
               tx.Fee = multiSignFee;

               console.info(`tx`, tx);
               return result.signedTx;
          } else {
               console.info(`tx`, tx);
               const preparedTx = await client.autofill(tx);
               return useRegularKeyWalletSignTx ? regularKeyWalletSignTx.sign(preparedTx) : wallet.sign(preparedTx);
          }
     }

     async signTransactionNoAutofill(client: any, wallet: xrpl.Wallet, tx: any, useRegularKeyWalletSignTx: boolean, regularKeyWalletSignTx: any, fee: string, useMultiSign: boolean, multiSignAddress: any, multiSignSeeds: any, noAutofill: boolean = false): Promise<{ tx_blob: string; hash: string } | null> {
          if (useMultiSign) {
               const signerAddresses = this.utilsService.getMultiSignAddress(multiSignAddress);
               const signerSeeds = this.utilsService.getMultiSignSeeds(multiSignSeeds);

               if (signerAddresses.length === 0) {
                    throw new Error('No signer addresses provided for multi-signing');
               }
               if (signerSeeds.length === 0) {
                    throw new Error('No signer seeds provided for multi-signing');
               }

               const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: tx, signerAddresses, signerSeeds, fee });

               tx.Signers = result.signers;

               // Recalculate fee for multisign
               const multiSignFee = String((signerAddresses.length + 1) * Number(fee));
               tx.Fee = multiSignFee;

               console.info(`tx`, tx);
               return result.signedTx;
          } else {
               console.info(`tx`, tx);
               const txToSign = noAutofill ? tx : await client.autofill(tx);
               return useRegularKeyWalletSignTx ? regularKeyWalletSignTx.sign(txToSign) : wallet.sign(txToSign);
          }
     }

     // HELPER: Submit or simulate transaction
     async submitTransaction(client: any, signedTx: { tx_blob: string; hash: string }): Promise<any> {
          console.log(`[REAL] Submitting transaction ${signedTx.hash} to network`);
          return await client.submitAndWait(signedTx.tx_blob);
     }

     async submitTransaction1(client: any, signedTx: { tx_blob: string; hash: string }): Promise<any> {
          console.log(`[REAL] Submitting transaction ${signedTx.hash} to network`);
          return await client.submit(signedTx.tx_blob);
     }

     async simulateTransaction(client: xrpl.Client, txJson: any): Promise<any> {
          console.log('[SIMULATE] Simulating transaction:', txJson);
          try {
               const simulation = await client.request({
                    command: 'simulate',
                    tx_json: txJson,
               });

               console.log('[SIMULATE] Result:', simulation);
               return simulation;
          } catch (err) {
               console.error('[SIMULATE] Error:', err);
               throw err;
          }
     }

     async waitForFinalOutcome(client: xrpl.Client, hash: string, lastLedger: number, signal?: AbortSignal): Promise<any> {
          while (true) {
               if (signal?.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
               }
               const ledger = await client.getLedgerIndex();
               if (ledger > lastLedger) {
                    throw new Error('Transaction expired (passed LastLedgerSequence)');
               }

               try {
                    const tx = await client.request({
                         command: 'tx',
                         transaction: hash,
                         binary: false,
                    });

                    if (tx.result.validated) {
                         return tx.result;
                    }
               } catch (err: any) {
                    throw new Error(`Error validating transaction: ${err.message}`);
               }

               await new Promise(r => setTimeout(r, 1200)); // ~every ledger
          }
     }

     processTxFinalResult(finalResult: any, message: string, result: { success: boolean; hash?: string; error?: string }) {
          if (this.utilsService.isTxSuccessful({ result: finalResult })) {
               this.toastService.success(message, AppConstants.TOAST.SUCCESS, true, result.hash, this.txUiService.explorerUrl() + 'tx/');
               this.txUiService.currentStep.set('success');
          } else {
               const errorMsg = this.utilsService.getTransactionResultMessage({ result: finalResult });
               this.toastService.error(`Transaction failed ${this.utilsService.processErrorMessageFromLedger(errorMsg)}`, AppConstants.TOAST.ERROR, true, result.hash, this.txUiService.explorerUrl() + 'tx/');
               this.txUiService.currentStep.set('failed');
          }
     }

     processTxError(waitError: any) {
          this.txUiService.currentStep.set('failed');
     }

     buildSendMaxAmount(currencyValue: string, issuerField: string, amountField: string, mptNeeded: boolean) {
          let sendMax;
          let paymentType;
          let currency;
          if (currencyValue === AppConstants.XRP_CURRENCY) {
               sendMax = xrpl.xrpToDrops(amountField);
               paymentType = 'XRP';
               currency = 'XRP';
          } else if (mptNeeded) {
               const curr: any = {
                    mpt_issuance_id: this.mptStoreService.mptIssuanceId(),
                    value: amountField,
               };
               sendMax = curr;
               paymentType = 'MPT';
          } else {
               sendMax = {
                    currency: this.utilsService.encodeIfNeeded(currencyValue),
                    value: amountField,
                    issuer: issuerField,
               };
               paymentType = 'IOU';
               currency = this.utilsService.encodeIfNeeded(currencyValue);
          }
          return { sendMax, paymentType, currency };
     }

     buildAmount(currencyCode: string, amount: string, currencyIssuer: string) {
          let amountToCash: any;
          if (currencyCode === AppConstants.XRP_CURRENCY) {
               amountToCash = xrpl.xrpToDrops(amount);
          } else {
               const encodedCurrency = this.utilsService.encodeIfNeeded(currencyCode);
               amountToCash = {
                    value: amount.toString(),
                    currency: encodedCurrency,
                    issuer: currencyIssuer,
               };
          }
          return { amountToCash };
     }
}
