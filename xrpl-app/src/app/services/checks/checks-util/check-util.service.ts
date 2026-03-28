import { computed, inject, Injectable, Signal, WritableSignal } from '@angular/core';
import { CopyUtilService } from '../../copy-util/copy-util.service';
import { DownloadUtilService } from '../../download-util/download-util.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { SelectItem } from '../../../components/ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../core/app.constants';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { CheckItem, CheckTxType } from '../../../components/checks/constants/checks.types';
import { ChecksStoreService } from '../checks-store/checks-store.service';

@Injectable({
     providedIn: 'root',
})
export class CheckUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly checksStoreService = inject(ChecksStoreService);

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

                    const expiration = obj.Expiration;
                    let isExpired = false;
                    if (expiration) {
                         const expirationUnix = expiration + AppConstants.RIPPLE_EPOCH_START;
                         const nowUnix = Math.floor(Date.now() / 1000);
                         isExpired = nowUnix > expirationUnix;
                    }

                    return {
                         id: obj.index,
                         index: obj.index,
                         amount,
                         sender: obj.Account,
                         sendMax,
                         expiration: obj.Expiration,
                         isExpired,
                         destinationTag: obj.DestinationTag,
                         invoiceId: obj.InvoiceID,
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));
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

                    const expiration = obj.Expiration;
                    let isExpired = false;
                    if (expiration) {
                         const expirationUnix = expiration + AppConstants.RIPPLE_EPOCH_START;
                         const nowUnix = Math.floor(Date.now() / 1000);
                         isExpired = nowUnix > expirationUnix;
                    }

                    return {
                         id: obj.index, // <-- CheckID
                         index: obj.index,
                         amount,
                         destination: obj.Destination,
                         sendMax,
                         expiration: obj.Expiration,
                         isExpired,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.utilsService.logObjects('cancellableChecks', mapped);
          return mapped;
     }

     getCheckById(id: string) {
          return [...this.checksStoreService.cashableChecks(), ...this.checksStoreService.cancellableChecks()].find(c => c.id === id);
     }

     getIssuerForCheck(checks: any[], checkIndex: string, currencyType: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          if (currencyType === 'Token') return check?.SendMax?.issuer || null;
          else return check?.Account || null;
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

     mapCheckItems(checks: Signal<any[]>, mode: Signal<'cashCheck' | 'cancelCheck' | 'createCheck'>, formatAmount: (amount: any) => string): Signal<SelectItem[]> {
          return computed(() => {
               const list = checks();
               const currentMode = mode();

               return list.map(check => {
                    const addr = currentMode === 'cashCheck' ? check.sender : check.destination;
                    const short = addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : 'Unknown';
                    const amount = formatAmount(check.sendMax);
                    const arrow = currentMode === 'cashCheck' ? '←' : '→';

                    return {
                         id: check.id,
                         display: `${amount} ${arrow} ${short}`,
                         secondary: check.id,
                         isCurrentAccount: false,
                         currency: check.sendMax.currency || 'XRP',
                         issuer: check.sendMax.issuer ?? '',
                    } as SelectItem;
               });
          });
     }

     filteredCheckItems(items: Signal<SelectItem[]>, searchQuery: Signal<string>): Signal<SelectItem[]> {
          return computed(() => {
               const q = searchQuery().trim().toLowerCase();
               if (!q) return items();

               return items().filter(item => {
                    return item.id.toLowerCase().includes(q) || item.display.toLowerCase().includes(q);
               });
          });
     }

     checkIdDisplay(selectedId: Signal<string>, items: Signal<SelectItem[]>, searchQuery: Signal<string>): Signal<string> {
          return computed(() => {
               const id = selectedId();
               if (!id) return searchQuery() || '';

               const item = items().find(i => i.id === id);
               return item ? item.display : id.slice(0, 20) + '...';
          });
     }

     onCheckSelected(item: SelectItem | null) {
          const id = item?.id || '';
          this.txUiService.checkIdField.set(id);

          if (item) {
               const parts = item.display?.split(' ') || [];
               this.txUiService.checkCreator.set(parts[3] || '');
               this.currencyStoreService.setField('currencyCode', parts[1] || '');
               this.currencyStoreService.setField('currencyIssuer', item.issuer || '');
               if (parts[1] === AppConstants.XRP_CURRENCY) {
                    this.xrplTxOptionsStore.setField('showEnableTrustline', false);
               }
          }
     }

     isCheckExpired = (expiration?: number): boolean => {
          if (!expiration) return false;
          const rippleEpochStart = new Date('2000-01-01T00:00:00Z').getTime() / 1000;
          const expirationUnix = expiration + rippleEpochStart;
          const nowUnix = Math.floor(Date.now() / 1000);
          return nowUnix > expirationUnix;
     };

     addToDateTimeField(fieldSignal: Signal<string>, writableSignal: WritableSignal<string>, seconds: number): void {
          let currentValue = fieldSignal();

          // If field is empty, start from now
          if (!currentValue) {
               const now = new Date();
               currentValue = this.xrplDateService.toLocalDateTimeString(now);
          }

          const date = new Date(currentValue);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.xrplDateService.toLocalDateTimeString(date);

          writableSignal.set(newDateTime);
     }
}
