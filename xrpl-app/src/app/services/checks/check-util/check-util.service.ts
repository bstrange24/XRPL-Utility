import { computed, inject, Injectable, Signal, WritableSignal } from '@angular/core';
import { CheckItem, CheckTxType } from '../../../models/interface-items.model';
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

type CheckConfigTxDisplayType = 'createCheck' | 'cashCheck' | 'cancelCheck';
type IconType = 'ng-icon' | 'lucide-icon';

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

     readonly tabs: {
          key: CheckConfigTxDisplayType;
          label: string;
          icon: string;
          iconType: IconType;
          color: string;
          iconSize: string;
     }[] = [
          {
               key: 'createCheck',
               label: 'Create',
               icon: 'heroPlusCircle',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'cashCheck',
               label: 'Cash',
               icon: 'heroCurrencyDollar',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'cancelCheck',
               label: 'Cancel',
               icon: 'heroTrash',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
     ];

     readonly tabMeta = {
          createCheck: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Create Check',
               desc: 'Create a check to another XRPL address.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          cashCheck: {
               icon: 'heroArrowPath',
               colorClass: 'green-button-submenu',
               title: 'Cash Check',
               desc: 'Cash check sent from another XRPL address.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          cancelCheck: {
               icon: 'shield-ellipsis',
               colorClass: 'red-button-submenu',
               title: 'Cancel Check',
               desc: 'Cancel check create from the selected account.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
     };

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly createCheckButtonLabel = this.buildTxLabel('Create Check');
     readonly cashCheckButtonLabel = this.buildTxLabel('Cash Check');
     readonly cancelCheckButtonLabel = this.buildTxLabel('Cancel Check');

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
               this.txUiService.currencyCode.set(parts[1] || '');
               this.txUiService.currencyIssuer.set(item.issuer || '');
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

     handleSimulationSuccess(type: CheckTxType, formValues: any, hash?: string) {
          let msg: string;

          if (type === 'createCheck') {
               msg = `Simulated Sending Check of ${formValues.amountField} ${formValues.currency || 'XRP'}`;
          } else if (type === 'cashCheck') {
               msg = `Simulated Cashing Check of ${formValues.amountField} ${formValues.currencyCode || 'XRP'}`;
          } else {
               msg = `Simulated Cancelling Check ${formValues.checkIdField}`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     buildSuccessMessage(type: CheckTxType, formValues: any): string {
          if (type === 'createCheck') {
               return `Successfully Sent Check of ${formValues.amountField} ${formValues.currency || 'XRP'} to ${formValues.destinationAddress?.slice(0, 7) + '…' + formValues.destinationAddress?.slice(-7)}`;
          }
          if (type === 'cashCheck') {
               return `Successfully Cashed Check of ${formValues.amountField} ${formValues.currencyCode || 'XRP'}`;
          }
          return `Successfully Cancelled Check ${formValues.checkIdField}`;
     }
}
