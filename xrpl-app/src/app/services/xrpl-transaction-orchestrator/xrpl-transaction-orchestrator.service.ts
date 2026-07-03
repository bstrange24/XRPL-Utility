import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { ExecuteTxParams, TxOrchestratorContext, TxOrchestratorResult } from './xrpl-transaction-orchestrator.types';

@Injectable({ providedIn: 'root' })
export class XrplTransactionOrchestratorService {
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly utilsService = inject(UtilsService);
     public readonly txUiService = inject(TransactionUiService);

     async executeTx<TTx extends xrpl.Transaction>(params: ExecuteTxParams<TTx>): Promise<TxOrchestratorResult> {
          // const { client, wallet, buildTx, validate } = params;
          const { client, wallet, buildTx, validate, skipSigning = false, preSignedTxBlob } = params;

          const mode = params.mode;
          const skipBalanceCheck = params.skipBalanceCheck ?? true;
          // if (mode !== 'simulate') this.txUiService.currentStep.set('preparing');

          const ui = params.ui ?? {};
          const { suppressIndividualFeedback = false, suppressPreview = false } = ui;

          const signing = params.signing ?? {};
          const { useMultiSign = false, multiSignAddress = '', multiSignSeeds = '', regularKeyAddress = '', isRegularKeyAddress = false, regularKeySeed = '' } = signing;

          const ctx: TxOrchestratorContext = {
               client,
               wallet,
               env: params.env,
               accountInfo: params.env?.accountInfo,
               accountObjects: params.env?.accountObjects,
               fee: params.env?.fee,
               serverInfo: params.env?.serverInfo,
          };

          // 1) Build tx
          let tx: TTx;
          try {
               tx = await buildTx(ctx);
          } catch (err: any) {
               const msg = err?.message || 'Failed to build transaction';
               this.txUiService.setError(msg);
               return { success: false, mode, error: msg };
          }

          // 2) Optional validation hook (feature orchestrator can pass errors here)
          if (validate) {
               try {
                    const errors = await validate(ctx, tx);
                    if (Array.isArray(errors) && errors.length > 0) {
                         const msg = errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`;
                         this.txUiService.setError(msg);
                         return { success: false, mode, tx, error: msg };
                    }
               } catch (err: any) {
                    const msg = err?.message || 'Validation failed';
                    this.txUiService.setError(msg);
                    return { success: false, mode, tx, error: msg };
               }
          }

          // 3) Optional balance check (disabled for Checks since you do token vs xrp checks there)
          if (!skipBalanceCheck) {
               try {
                    const insufficientMsg = 'Insufficient XRP to complete transaction';
                    const amount = '0';
                    if (this.utilsService.isInsufficientXrpBalance1(ctx.serverInfo, ctx.accountInfo, amount, wallet.classicAddress, tx, String(ctx.fee ?? '0'))) {
                         this.txUiService.setError(insufficientMsg);
                         return { success: false, mode, tx, error: insufficientMsg };
                    }
               } catch (err: any) {
                    const msg = err?.message || 'Balance check failed';
                    this.txUiService.setError(msg);
                    return { success: false, mode, tx, error: msg };
               }
          }

          // 4) Preview (consistent across pages)
          if (!suppressPreview) this.txUiService.addTxSignal(tx);

          let response: any;

          try {
               if (mode === 'simulate') {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
                    if (response?.result) this.txUiService.addTxResultSignal(response.result);
               } else {
                    const fee = params.env?.fee;
                    if (!fee) throw new Error('Missing fee in env');

                    let signedTx: { tx_blob: string; hash: string } | null = null;

                    // If we have a pre-signed transaction blob, use it directly
                    if (preSignedTxBlob) {
                         signedTx = {
                              tx_blob: preSignedTxBlob,
                              hash: this.utilsService.computeHash(preSignedTxBlob), // You'll need to implement this
                         };
                         console.log('Using pre-signed transaction blob');
                    } else if (skipSigning) {
                         // If skipSigning is true but no preSignedTxBlob, use the tx as-is
                         // This is for when the transaction is already fully signed
                         const txBlob = (tx as any).tx_blob || (tx as any).blob;
                         if (txBlob) {
                              signedTx = {
                                   tx_blob: txBlob,
                                   hash: (tx as any).hash || this.utilsService.computeHash(txBlob),
                              };
                         } else {
                              throw new Error('Transaction is not signed and no preSignedTxBlob provided');
                         }
                    } else {
                         // Normal signing flow
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(params.signing?.useMultiSign || false, params.signing?.regularKeyAddress || '', params.signing?.isRegularKeyAddress || false, params.signing?.regularKeySeed || '');

                         signedTx = await this.xrplTransactions.signTransaction(client, wallet, tx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, params.signing?.useMultiSign || false, params.signing?.multiSignAddress || '', params.signing?.multiSignSeeds || '');
                    }

                    if (!signedTx) {
                         const msg = 'Failed to sign transaction.';
                         this.txUiService.setError(msg);
                         return { success: false, mode, tx, error: msg };
                    }

                    this.txUiService.currentStep.set('waiting_validation');
                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    // const fee = params.env?.fee;
                    // if (!fee) throw new Error('Missing fee in env');

                    // const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(useMultiSign, regularKeyAddress, isRegularKeyAddress, regularKeySeed);

                    // const signedTx = await this.xrplTransactions.signTransaction(client, wallet, tx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, useMultiSign, multiSignAddress, multiSignSeeds);

                    // if (!signedTx) {
                    //      const msg = 'Failed to sign transaction.';
                    //      this.txUiService.setError(msg);
                    //      return { success: false, mode, tx, error: msg };
                    // }

                    // this.txUiService.currentStep.set('waiting_validation');
                    // // response = await this.xrplTransactions.submitAndWaitTransaction(client, signedTx);
                    // response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // if (response?.result) this.txUiService.addTxResultSignal(response.result);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess && mode !== 'simulate') {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${mode} failed: ${resultMsg}`, response);

                    if (response?.result) {
                         response.result.errorMessage = userMessage;
                         this.txUiService.addTxResultSignal(response.result);
                    }

                    this.txUiService.setError(userMessage);
                    return { success: false, mode, tx, error: userMessage, response };
               }

               const hash = response?.result?.hash ?? response?.result?.tx_json?.hash ?? undefined;

               // Consistent hash/success signals
               if (!suppressIndividualFeedback) {
                    if (hash) this.txUiService.addTxHashSignal(hash);
                    this.txUiService.setSuccess(this.txUiService.result());
               }

               return { success: true, mode, hash, tx, response };
          } catch (err: any) {
               const msg = err?.message || 'Unknown error during transaction';
               this.txUiService.setError(msg);
               return { success: false, mode, tx, error: msg };
          }
     }
}
