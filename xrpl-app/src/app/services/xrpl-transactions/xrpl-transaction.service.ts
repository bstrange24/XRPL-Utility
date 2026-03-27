import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { PaymentChannelUtilService } from '../payment-channel/payment-channel-util/payment-channel-util.service';
import { CredentialStore } from '../credentials/credential-store/credential-store.service';
import { Wallet } from '../wallets/manager/wallet-manager.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';

@Injectable({
     providedIn: 'root',
})
export class XrplTransactionService extends PerformanceBaseComponent {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly utilsService = inject(UtilsService);
     private readonly toastService = inject(ToastService);
     private readonly txUiService = inject(TransactionUiService);
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

     async runWithConcurrencyLimit<T>(items: T[], limit: number, handler: (item: T, index: number) => Promise<any>): Promise<any[]> {
          const results: any[] = new Array(items.length);
          let index = 0;

          const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
               while (index < items.length) {
                    const currentIndex = index++;
                    try {
                         results[currentIndex] = await handler(items[currentIndex], currentIndex);
                    } catch (err) {
                         results[currentIndex] = { success: false, error: err };
                    }
               }
          });

          await Promise.all(workers);
          return results;
     }

     buildModifyAccountSetTransaction(wallet: xrpl.Wallet, fee: string, currentLedger: number): xrpl.AccountSet {
          return {
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildModifyMultiSignTransaction(wallet: xrpl.Wallet, fee: string, currentLedger: number): xrpl.SignerListSet {
          return {
               TransactionType: 'SignerListSet',
               Account: wallet.classicAddress,
               SignerQuorum: 0,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildModifySetRegularKeyTransaction(wallet: xrpl.Wallet, fee: string, currentLedger: number): xrpl.SetRegularKey {
          return {
               TransactionType: 'SetRegularKey',
               Account: wallet.classicAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildModifyDepositAuthTransaction(wallet: xrpl.Wallet, authorizeFlag: string, depositAuthAddress: any, fee: string, currentLedger: number): xrpl.DepositPreauth {
          return {
               TransactionType: 'DepositPreauth',
               Account: wallet.classicAddress,
               [authorizeFlag === 'Y' ? 'Authorize' : 'Unauthorize']: depositAuthAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
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

     buildAccountDeleteTransaction(wallet: xrpl.Wallet, destinationAddress: string, accountInfo: any, currentLedger: number): xrpl.AccountDelete {
          return {
               TransactionType: 'AccountDelete',
               Account: wallet.classicAddress,
               Destination: destinationAddress,
               Sequence: accountInfo.result.account_data.Sequence,
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

     buildTrustlineSetTransaction(wallet: xrpl.Wallet, limitAmount: xrpl.IssuedCurrencyAmount, fee: string | undefined, currentLedger: number | undefined): xrpl.TrustSet {
          return {
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: limitAmount,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildIssueCurrencyTransaction(wallet: xrpl.Wallet, sendMax: string | { currency: string; value: string; issuer: string }, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.Payment {
          return {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: destinationAddress,
               Amount: sendMax,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildClawbackTransaction(wallet: xrpl.Wallet, sendMax: any, fee: string | undefined, currentLedger: number | undefined): xrpl.Clawback {
          return {
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: sendMax,
               Fee: fee,
               LastLedgerSequence: currentLedger! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildCreateCredentialTransaction(wallet: xrpl.Wallet, subject: string, credentialType: string, fee: string, currentLedger: number): xrpl.CredentialCreate {
          return {
               TransactionType: 'CredentialCreate',
               Account: wallet.classicAddress,
               CredentialType: Buffer.from(credentialType, 'utf8').toString('hex'),
               Subject: subject,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildAcceptCredentialTransaction(wallet: xrpl.Wallet, issuer: string, credentialType: string, fee: string, currentLedger: number): xrpl.CredentialAccept {
          return {
               TransactionType: 'CredentialAccept',
               Account: wallet.classicAddress,
               Issuer: issuer,
               CredentialType: Buffer.from(credentialType, 'utf8').toString('hex'),
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildDeleteCredentialTransaction(wallet: xrpl.Wallet, subject: string, credentialType: string, fee: string, currentLedger: number): xrpl.CredentialDelete {
          return {
               TransactionType: 'CredentialDelete',
               Account: wallet.classicAddress,
               CredentialType: Buffer.from(credentialType, 'utf8').toString('hex'),
               Subject: subject,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildSetDidTransaction(wallet: xrpl.Wallet, fee: string, currentLedger: number): xrpl.DIDSet {
          return {
               TransactionType: 'DIDSet',
               Account: wallet.classicAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildDeleteDidTransaction(wallet: xrpl.Wallet, fee: string, currentLedger: number): xrpl.DIDDelete {
          return {
               TransactionType: 'DIDDelete',
               Account: wallet.classicAddress,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildPermissionedDomainSetTransaction(wallet: xrpl.Wallet, credentialIssuer: string, credentialType: string, fee: string, currentLedger: number): xrpl.PermissionedDomainSet {
          return {
               TransactionType: 'PermissionedDomainSet',
               Account: wallet.classicAddress,
               AcceptedCredentials: [
                    {
                         Credential: {
                              Issuer: credentialIssuer,
                              CredentialType: Buffer.from(credentialType, 'utf8').toString('hex'),
                         },
                    },
               ],
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };
     }

     buildPermissionedDomainDeleteTransaction(wallet: xrpl.Wallet, domainId: string, fee: string, currentLedger: number): xrpl.PermissionedDomainDelete {
          return {
               TransactionType: 'PermissionedDomainDelete',
               Account: wallet.classicAddress,
               DomainID: domainId,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
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

     buildCreateTimeBasedEscrowTransaction(wallet: xrpl.Wallet, amountToCash: any, destinationAddress: string, fee: string | undefined, currentLedger: number | undefined): xrpl.EscrowCreate {
          return {
               TransactionType: 'EscrowCreate',
               Account: wallet.address,
               Amount: amountToCash,
               Destination: destinationAddress,
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
                    value: amount.toString(),
                    currency: encodedCurrency,
                    issuer: currencyIssuer,
               };

               currency = encodedCurrency;
               paymentType = 'IOU';
          }
          return { amountToCash, paymentType, currency };
     }
}
