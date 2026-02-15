import { computed, inject, Injectable } from '@angular/core';
import { CheckItem } from '../../models/interface-items.model';
import { CopyUtilService } from '../copy-util/copy-util.service';
import { DownloadUtilService } from '../download-util/download-util.service';
import { StorageService } from '../local-storage/storage.service';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { UtilsService } from '../util-service/utils.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../components/base/performance-base/performance-base.component';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class CheckUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);

     getExistingChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         id: obj.index,
                         index: obj.index,
                         amount: `${amount} ${currency}`,
                         destination: obj.Destination,
                         sendMax,
                         expiration: obj.Expiration,
                         destinationTag: obj.DestinationTag,
                         sourceTag: obj.SourceTag,
                         invoiceId: obj.InvoiceID,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          // this.existingChecks.set(mapped);
          this.utilsService.logObjects('existingChecks', mapped);
          return mapped;
     }

     getCashableChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }
                    return {
                         id: obj.index,
                         index: obj.index,
                         amount,
                         sender: obj.Account,
                         sendMax,
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));
          // this.cashableChecks.set(mapped);
          this.utilsService.logObjects('cashableChecks', mapped);
          return mapped;
     }

     getCancelableChecks(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === sender)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         // XRP (drops)
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         // IOU
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    return {
                         id: obj.index, // <-- CheckID
                         index: obj.index,
                         amount,
                         destination: obj.Destination,
                         sendMax,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          // this.cancellableChecks.set(mapped);
          this.utilsService.logObjects('cancellableChecks', mapped);
          return mapped;
     }

     getCheckItems(activeTab: string, cashCheckItems: any, cancelCheckItems: any): CheckItem[] | null {
          return activeTab === 'cash' ? cashCheckItems : cancelCheckItems;
     }

     getSelectedCheckItem(activeTab: string, cashCheckItems: any, cancelCheckItems: any): CheckItem | null {
          const id = this.txUiService.checkIdField();
          if (!id) return null;

          const items = this.getCheckItems(activeTab, cashCheckItems, cancelCheckItems);
          if (!items) return null;

          return items.find((item: { id: string }) => item.id === id) ?? null;
     }
}
