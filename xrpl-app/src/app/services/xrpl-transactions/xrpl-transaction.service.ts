import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';

@Injectable({
     providedIn: 'root',
})
export class XrplTransactionService {
     constructor(
          private readonly utilsService: UtilsService,
          private readonly toastService: ToastService,
          private readonly txUiService: TransactionUiService
     ) {}

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
          const msg = waitError.message?.includes('expired') ? 'Transaction expired (ledger timeout). It was not included in the ledger.' : `Failed to confirm transaction: ${waitError.message}`;
          this.toastService.error(msg, 7000);
     }

     buildSendXrpTransaction(wallet: xrpl.Wallet, destinationAddress: string, amount: number, fee: string, currentLedger: number): xrpl.Payment {
          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destinationAddress,
               Amount: xrpl.xrpToDrops(amount.toString()),
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildTicketCreateTransaction(wallet: xrpl.Wallet, ticketCount: string, fee: string, currentLedger: number): xrpl.TicketCreate {
          return {
               TransactionType: 'TicketCreate',
               Account: wallet.classicAddress,
               TicketCount: Number.parseInt(ticketCount),
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildTicketDeleteTransaction(wallet: xrpl.Wallet, ticketSeq: string, fee: string, currentLedger: number): xrpl.AccountSet {
          return {
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               TicketSequence: Number(ticketSeq),
               Sequence: 0,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }
}
