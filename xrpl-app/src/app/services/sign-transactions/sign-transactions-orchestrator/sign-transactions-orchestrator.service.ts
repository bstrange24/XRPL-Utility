import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { SignTransactionUtilService } from '../sign-transactions-util/sign-transaction-util.service';
import { SignTransationStoreService } from '../sign-transaction-store/sign-transation-store.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';

export interface GenerateJsonOptions {
     wallet: any;
     env: any;
     selectedTransaction: string;
     isTicketEnabled: boolean;
     ticketSequence: string;
     isMemoEnabled: boolean;
}

export interface SignTxOptions {
     txJson: string;
     env: any;
     isRegularKeyAddress: boolean;
     regularKeyAddress: string;
     regularKeySeed: string;
}

export interface SignForMultiSignOptions {
     txJson: string;
     env: any;
     signers: Array<{ Account: string; seed: string }>;
}

export interface SubmitTxOptions {
     txJson: string;
     outputField: string;
     env: any;
     isSimulateEnabled: boolean;
     txType: string;
}

@Injectable({
     providedIn: 'root',
})
export class SignTransactionsOrchestratorService {
     private readonly txEnv = inject(TxEnvironmentService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly xrplService = inject(XrplService);
     private readonly signTransactionUtilService = inject(SignTransactionUtilService);
     private readonly signTransationStoreService = inject(SignTransationStoreService);
     private readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     // Generate TX JSON
     async generateTransactionJson(options: GenerateJsonOptions): Promise<string> {
          const { wallet, env, selectedTransaction, isTicketEnabled, ticketSequence, isMemoEnabled } = options;

          const jsonStr = await this.signTransactionUtilService.buildTransactionText({
               client: env.client,
               wallet: env.wallet ?? wallet,
               accountInfo: env.accountInfo!,
               fee: env.fee,
               currentLedger: env.currentLedger,
               selectedTransaction: selectedTransaction as any,
               isTicketEnabled,
               isMemoEnable: isMemoEnabled,
               ticketSequence,
          });

          return jsonStr;
     }

     // Sign Transaction (regular or regular-key)
     async signTransaction(options: SignTxOptions): Promise<string | null> {
          const { txJson, env, isRegularKeyAddress, regularKeyAddress, regularKeySeed } = options;

          let txToSign: any = this.cleanTx(JSON.parse(txJson.trim()));
          txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

          let signed: { tx_blob: string; hash: string };

          if (isRegularKeyAddress && regularKeySeed) {
               const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(false, regularKeyAddress, true, regularKeySeed);
               if (!useRegularKeyWalletSignTx || !regularKeyWalletSignTx) {
                    throw new Error('Could not derive regular key wallet from the provided seed.');
               }
               signed = regularKeyWalletSignTx.sign(txToSign);
          } else {
               signed = env.wallet.sign(txToSign);
          }

          return signed.tx_blob;
     }

     // Sign for Multi-Sign
     async signForMultiSign(options: SignForMultiSignOptions): Promise<string | null> {
          const { txJson, env, signers } = options;

          if (!signers.length) {
               throw new Error('Select at least one signer.');
          }

          let txToSign: any = this.cleanTx(JSON.parse(txJson.trim()));
          txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

          const addresses = signers.map((acc: { Account: any }) => acc.Account).join(',');
          const seeds = signers.map((acc: { seed: any }) => acc.seed).join(',');
          const fee = await this.xrplService.calculateTransactionFee(env.client);
          const signerAddresses = this.utilsService.getMultiSignAddress(addresses);
          const signerSeeds = this.utilsService.getMultiSignSeeds(seeds);
          const result = await this.utilsService.handleMultiSignTransaction({ client: env.client, wallet: env.wallet, tx: txToSign, signerAddresses, signerSeeds, fee });

          return result.signedTx?.tx_blob ?? null;
     }

     // Submit Transaction
     async submitTransaction(options: SubmitTxOptions): Promise<{ success: boolean; hash?: string; error?: string; response?: any }> {
          try {
               const { txJson, outputField, env, isSimulateEnabled } = options;

               let response: any;

               if (isSimulateEnabled) {
                    const txToSign = this.cleanTx(JSON.parse(txJson.trim()));
                    txToSign.LastLedgerSequence = env.ledgerInfo.lastIndex! + 5;
                    response = await this.xrplTransactionService.simulateTransaction(env.client, txToSign);
               } else {
                    this.txUiService.currentStep.set('waiting_validation');
                    response = await env.client.submitAndWait(outputField.trim());
               }

               const isSuccess = this.utilsService.isTxSuccessful(response);

               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = '\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                    if (response.result) response.result.errorMessage = userMessage;
                    return { success: false, error: userMessage };
               }

               const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';
               return { success: true, hash, response };
          } catch (error: any) {
               const userMessage = '\n' + this.utilsService.processErrorMessageFromLedger(error.message);
               return { success: false, error: userMessage };
          }
     }

     // Memo JSON helpers (used by component effects)
     applyMemoToJson(txJson: string, memos: string[]): string {
          try {
               const tx = JSON.parse(txJson);
               this.utilsService.addMemoField(tx, memos);
               return JSON.stringify(tx, null, 2);
          } catch (error: any) {
               console.error(`Error applying memo to JSON: ${error.message}`);
               return txJson;
          }
     }

     removeMemoFromJson(txJson: string): string {
          try {
               const tx = JSON.parse(txJson);
               delete tx.Memos;
               return JSON.stringify(tx, null, 2);
          } catch {
               return txJson;
          }
     }

     // Ticket JSON helpers (used by component effects)
     applyTicketToJson(txJson: string, ticketSequence: string): string {
          try {
               const tx = JSON.parse(txJson);
               tx.TicketSequence = Number(ticketSequence);
               tx.Sequence = 0;
               return JSON.stringify(tx, null, 2);
          } catch {
               return txJson;
          }
     }

     removeTicketFromJson(txJson: string, originalSequence: number): string {
          try {
               const tx = JSON.parse(txJson);
               delete tx.TicketSequence;
               tx.Sequence = originalSequence;
               return JSON.stringify(tx, null, 2);
          } catch {
               return txJson;
          }
     }

     // Helpers
     cleanTx(editedJson: any): any {
          const defaults: Record<string, any[]> = {
               DestinationTag: [0],
               SourceTag: [0],
               InvoiceID: [0, ''],
          };

          for (const field in defaults) {
               if (Object.hasOwn(editedJson, field) && defaults[field].includes(editedJson[field])) {
                    delete editedJson[field];
               }
          }

          if (Array.isArray(editedJson.Memos)) {
               editedJson.Memos = editedJson.Memos.filter((memoObj: any) => {
                    const memo = memoObj?.Memo;
                    if (!memo) return false;
                    const memoDataEmpty = !memo.MemoData || memo.MemoData === '' || memo.MemoData === 0;
                    const memoTypeEmpty = !memo.MemoType || memo.MemoType === '' || memo.MemoType === 0;
                    return !(memoDataEmpty || memoTypeEmpty);
               });

               if (editedJson.Memos.length === 0) {
                    delete editedJson.Memos;
               }
          }

          if (typeof editedJson.Amount === 'string' && this.signTransationStoreService.selectedTransaction() === 'sendXrp') {
               editedJson.Amount = xrpl.xrpToDrops(editedJson.Amount);
          }

          return editedJson;
     }
}
