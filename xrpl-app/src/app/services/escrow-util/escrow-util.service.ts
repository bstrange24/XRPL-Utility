import { inject, Injectable, signal } from '@angular/core';
import { CopyUtilService } from '../copy-util/copy-util.service';
import { DownloadUtilService } from '../download-util/download-util.service';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { UtilsService } from '../util-service/utils.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { EscrowDataForUI } from '../../models/interface-items.model';
import { sortedIndex } from 'lodash';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';

@Injectable({
     providedIn: 'root',
})
export class EscrowUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     private readonly xrplCache = inject(XrplCacheService);

     getExistingEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter(
                    (obj: any) =>
                         obj.LedgerEntryType === 'Escrow' &&
                         obj.Account === classicAddress &&
                         // Only time-based escrows:
                         (obj.FinishAfter || obj.CancelAfter) &&
                         !obj.Condition
               )
               .map((obj: any): EscrowDataForUI => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                         currency = '';
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         Account: obj.Account,
                         Amount: `${amount} ${currency}`,
                         Destination: obj.Destination,
                         DestinationTag: obj.DestinationTag,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                         TxHash: obj.PreviousTxnID,
                         Sequence: obj.PreviousTxnID,
                    };
               })
               .sort((a, b) => a.Destination.localeCompare(b.Destination));

          // this.existingEscrow.set(mapped);
          this.utilsService.logObjects('existingEscrow', mapped);
          return mapped;
     }

     async getExpiredOrFulfilledEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string, activeTab: string) {
          const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter(
               (obj: any) =>
                    obj.LedgerEntryType === 'Escrow' &&
                    (activeTab === 'cancel'
                         ? obj.Account === classicAddress // owner can cancel
                         : obj.Destination === classicAddress) // receiver can finish
          );

          const processedEscrows = await Promise.all(
               filteredEscrows.map(async (obj: any) => {
                    const sendMax = obj.Amount;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              // const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              const sequenceTx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
                         } catch (error) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
                         }
                    }

                    return {
                         Amount: amount,
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         EscrowSequence,
                    };
               })
          );

          const sortEscrows = processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender));
          //  this.expiredOrFulfilledEscrows.set(processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender)));
          this.utilsService.logObjects('expiredOrFulfilledEscrows', sortEscrows);
          return sortEscrows;
     }

     loadAllEscrows1(accountObjects: xrpl.AccountObjectsResponse) {
          let allEscrowsRaw = signal<any[]>([]);
          const rawEscrows = (accountObjects.result.account_objects ?? [])
               .filter(obj => obj.LedgerEntryType === 'Escrow' && (obj.FinishAfter || obj.CancelAfter)) // && !obj.Condition)
               .map(async (obj: any) => {
                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              // const tx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              const tx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                              EscrowSequence = tx.result.tx_json.Sequence ?? null;
                         } catch (e) {
                              console.warn('Failed to fetch sequence for escrow', obj.PreviousTxnID);
                         }
                    }

                    const amount = typeof obj.Amount === 'string' ? xrpl.dropsToXrp(obj.Amount) : obj.Amount.value + ' ' + this.utilsService.normalizeCurrencyCode(obj.Amount.currency);

                    return {
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         Amount: obj.Amount,
                         EscrowSequence,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                    };
               });

          // Resolve all async sequences
          Promise.all(rawEscrows).then(resolved => {
               allEscrowsRaw.set(resolved);
          });
          return allEscrowsRaw;
     }

     async loadAllEscrows(accountObjects: xrpl.AccountObjectsResponse): Promise<any[]> {
          const rawEscrows = (accountObjects.result.account_objects ?? [])
               .filter(obj => obj.LedgerEntryType === 'Escrow' && (obj.FinishAfter || obj.CancelAfter))
               .map(async (obj: any) => {
                    let EscrowSequence: number | null = null;

                    if (obj.PreviousTxnID) {
                         try {
                              const tx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                              EscrowSequence = tx.result.tx_json.Sequence ?? null;
                         } catch (e) {
                              console.warn('Failed to fetch sequence for escrow', obj.PreviousTxnID);
                         }
                    }

                    return {
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         Amount: obj.Amount,
                         EscrowSequence,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                    };
               });

          return Promise.all(rawEscrows);
     }
}
