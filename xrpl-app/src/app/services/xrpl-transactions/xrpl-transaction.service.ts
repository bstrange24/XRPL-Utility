import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { PaymentChannelUtilService } from '../payment-channel/payment-channel-util/payment-channel-util.service';

@Injectable({
     providedIn: 'root',
})
export class XrplTransactionService {
     constructor(
          private readonly utilsService: UtilsService,
          private readonly toastService: ToastService,
          private readonly txUiService: TransactionUiService,
          private readonly paymentChannelUtilService: PaymentChannelUtilService
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
          // const msg = waitError.message?.includes('expired') ? 'Transaction expired (ledger timeout). It was not included in the ledger.' : `Failed to confirm transaction: ${waitError.message}`;
          // this.toastService.error(msg, 7000);
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

     buildTrustlineSetTransaction(wallet: xrpl.Wallet, sendMax: string | { currency: string; value: string; issuer: string }, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.TrustSet {
          return {
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: {
                    currency: 'currencyFieldTemp',
                    issuer: 'issuerFields',
                    value: '',
               },
               Destination: destinationAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildIssueCurrencyTransaction(wallet: xrpl.Wallet, sendMax: string | { currency: string; value: string; issuer: string }, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.Payment {
          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destinationAddress,
               Amount: {
                    currency: '',
                    value: '',
                    issuer: 'this.issuerFields()',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildClawbackTransaction(wallet: xrpl.Wallet, sendMax: string | { currency: string; value: string; issuer: string }, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.Clawback {
          return {
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: {
                    currency: 'currencyFieldTemp',
                    issuer: destinationAddress,
                    value: 'this.amountField()',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCreateCheckTransaction(wallet: xrpl.Wallet, sendMax: string | { currency: string; value: string; issuer: string }, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.CheckCreate {
          return {
               TransactionType: 'CheckCreate',
               Account: wallet.classicAddress,
               SendMax: sendMax,
               Destination: destinationAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCashCheckTransaction(wallet: xrpl.Wallet, amountToCash: any, checkId: string, fee: string | undefined, currentLedger: number | undefined): xrpl.CheckCash {
          return {
               TransactionType: 'CheckCash',
               Account: wallet.classicAddress,
               Amount: amountToCash,
               CheckID: checkId,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCheckCancelTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, checkIdField: string): xrpl.CheckCancel {
          return {
               TransactionType: 'CheckCancel',
               Account: wallet.classicAddress,
               CheckID: checkIdField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCreateTimeBasedEscrowTransaction(wallet: xrpl.Wallet, amountToCash: any, destinationAddress: string, finishAfterTime: number, cancelAfterTime: number, fee: string | undefined, currentLedger: number | undefined): xrpl.EscrowCreate {
          return {
               TransactionType: 'EscrowCreate',
               Account: wallet.address,
               Amount: amountToCash,
               Destination: destinationAddress,
               FinishAfter: finishAfterTime,
               CancelAfter: cancelAfterTime,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildFinishTimeBasedEscrowTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, escrowOwnerField: string, escrowSequenceNumberField: number): xrpl.EscrowFinish {
          return {
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: escrowOwnerField,
               OfferSequence: escrowSequenceNumberField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCancelTimeBasedEscrowTransaction(wallet: xrpl.Wallet, escrowOwner: string, fee: string | undefined, currentLedger: number | undefined, escrowSequenceNumberField: number): xrpl.EscrowCancel {
          return {
               TransactionType: 'EscrowCancel',
               Account: wallet.classicAddress,
               Owner: escrowOwner,
               OfferSequence: escrowSequenceNumberField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildPaymentChannelCreateTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.PaymentChannelCreate {
          return {
               TransactionType: 'PaymentChannelCreate',
               Account: wallet.classicAddress,
               Amount: xrpl.xrpToDrops(formValues.amount),
               Destination: formValues.destinationAddress,
               SettleDelay: Number.parseInt(formValues.settleDelay),
               PublicKey: wallet.publicKey,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildPaymentChannelFundTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.PaymentChannelFund {
          return {
               TransactionType: 'PaymentChannelFund',
               Account: wallet.classicAddress,
               Channel: formValues.channelIDField,
               Amount: xrpl.xrpToDrops(formValues.amount),
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildPaymentChannelClaimTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.PaymentChannelClaim {
          return {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: formValues.channelIDField,
               Balance: xrpl.xrpToDrops(formValues.amount),
               Signature: formValues.channelClaimSignatureField,
               PublicKey: formValues.publicKeyField || wallet.publicKey,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
               Flags: this.paymentChannelUtilService.flags.close ? xrpl.PaymentChannelClaimFlags.tfClose : undefined,
          };
     }

     buildPaymentChannelRenewTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.PaymentChannelClaim {
          return {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: formValues.channelIDField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
               Flags: xrpl.PaymentChannelClaimFlags.tfRenew,
          };
     }

     buildPaymentChannelCloseTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, channelIDField: string): xrpl.PaymentChannelClaim {
          return {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: channelIDField,
               Flags: xrpl.PaymentChannelClaimFlags.tfClose,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildMptCreateTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.MPTokenIssuanceCreate {
          return {
               TransactionType: 'MPTokenIssuanceCreate',
               Account: wallet.classicAddress,
               MaximumAmount: formValues.tokenCountField.toString(),
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildMptAuthorizeTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.MPTokenAuthorize {
          return {
               TransactionType: 'MPTokenAuthorize',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: formValues.mptIssuanceIdField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildMptLockTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.MPTokenIssuanceSet {
          return {
               TransactionType: 'MPTokenIssuanceSet',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: formValues.mptIssuanceIdField,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: fee,
          };
     }

     buildMptSendTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.Payment {
          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Amount: {
                    mpt_issuance_id: formValues.mptIssuanceIdField,
                    value: formValues.amount.toString(),
               },
               Destination: formValues.destinationAddress,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: fee,
          };
     }

     buildMptDestroyTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.MPTokenIssuanceDestroy {
          return {
               TransactionType: 'MPTokenIssuanceDestroy',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: formValues.mptIssuanceIdField,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildMptClawbackTransaction(wallet: xrpl.Wallet, fee: string | undefined, currentLedger: number | undefined, formValues: any): xrpl.Clawback {
          return {
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: formValues.tokenCountField.toString(),
               Holder: formValues.destinationAddress,
               Fee: fee,
               Flags: 0, // Typically 0 for clawback unless specific flags are needed
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
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
                    mpt_issuance_id: this.txUiService.mptIssuanceIdField(),
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
          let currency: string;
          let paymentType;

          if (currencyCode === AppConstants.XRP_CURRENCY) {
               amountToCash = xrpl.xrpToDrops(amount);
               currency = 'XRP';
               paymentType = 'XRP';
          } else {
               const encodedCurrency = this.utilsService.encodeIfNeeded(currencyCode);

               amountToCash = {
                    value: amount,
                    currency: encodedCurrency,
                    issuer: currencyIssuer,
               };

               currency = encodedCurrency;
               paymentType = 'IOU';
          }
          return { amountToCash, paymentType, currency };
     }
}
