import { computed, inject, Injectable, signal } from '@angular/core';
import { CheckActionTypes, CheckListItem } from '../../../components/checks/constants/checks.types';
import { ChecksStoreService } from '../checks-store/checks-store.service';
import { CheckUtilService } from '../checks-util/check-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';

@Injectable({
     providedIn: 'root',
})
export class ChecksTransactionViewModelService {
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     readonly activeTab = signal<CheckActionTypes>('createCheck');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();

     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());
     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.currencyStoreService.currency()) ?? null);
     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.currencyStoreService.issuer()) ?? null);

     readonly checkCount = computed(() => {
          const tab = this.activeTab();
          if (tab === 'createCheck') return this.checksStoreService.existingChecks().length;
          if (tab === 'cashCheck') return this.checksStoreService.cashableChecks().length;
          if (tab === 'cancelCheck') return this.checksStoreService.cancellableChecks().length;
          return 0;
     });

     readonly checksToShow = computed<CheckListItem[]>(() => {
          const tab = this.activeTab();
          const address = this.walletManagerService.getSelectedWallet()?.address;

          if (!address) return [];

          if (tab === 'createCheck') {
               // Outgoing checks created by you
               return this.checksStoreService.existingChecks().map(c => ({
                    tab: 'createCheck',
                    id: c.id,
                    index: c.id,
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                    destination: c.destination,
                    destinationTag: c.destinationTag,
                    expiration: c.expiration,
                    invoiceId: c.invoiceId,
                    isExpired: this.checkUtilService.isCheckExpired(c.expiration),
               }));
          }

          if (tab === 'cashCheck') {
               // Incoming escrows you can cash
               return this.checksStoreService.cashableChecks().map(c => ({
                    tab: 'cashCheck',
                    id: c.id,
                    index: c.id,
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                    destination: c.destination,
                    sender: c.sender,
                    expiration: c.expiration,
                    isExpired: this.checkUtilService.isCheckExpired(c.expiration),
               }));
          }

          if (tab === 'cancelCheck') {
               return this.checksStoreService.cancellableChecks().map(c => ({
                    tab: 'cancelCheck',
                    id: c.id,
                    index: c.id,
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                    destination: c.destination,
                    expiration: c.expiration,
                    isExpired: this.checkUtilService.isCheckExpired(c.expiration),
               }));
          }

          return [];
     });

     readonly explorerLinks = computed(() => {
          const tab = this.activeTab();
          if (tab !== 'createCheck') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          if (this.checksStoreService.existingChecks().length > 0) {
               links.push(`<a href="${base}account/${addr}/checks" target="_blank" rel="noopener" class="xrpl-win-link">View Checks</a>`);
          }
          if (this.checksStoreService.existingIOUs().length > 0) {
               links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          }
          /**
           * Added this for MPT checks if they are ever an option on the XRPL
           * if (this.existingMpts().length > 0) {
           *   links.push(`<a href="${base}account/${addr}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
           * }
           */

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          return {
               walletName: wallet.name,
               checkCount: this.checkCount(),
               checksToShow: this.checksToShow(),
               links: this.explorerLinks(),
          };
     });

     readonly currentWalletData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          return {
               address: wallet.address,
               name: wallet.name || wallet.address.slice(0, 10) + '...',
          };
     });

     selectedCheckItem = computed<SelectItem | null>(() => {
          const id = this.checksStoreService.checkIdField();
          if (!id) return null;

          const items = this.checkItems();
          if (!items) return null;

          return items.find((item: { id: string }) => item.id === id) ?? null;
     });

     selectedCheckIsExpired = computed(() => this.selectedFullCheck()?.isExpired ?? false);

     checkItems = computed(() => {
          const mode = this.activeTab();
          const checks = mode === 'cashCheck' ? this.checksStoreService.cashableChecks : this.checksStoreService.cancellableChecks;
          const modeSignal = this.activeTab;
          return this.checkUtilService.mapCheckItems(checks, modeSignal, amt => this.utilsService.formatIOUXrpAmountOutstanding(amt))();
     });

     checkIdDisplay = this.checkUtilService.checkIdDisplay(this.checksStoreService.checkIdField, this.checkItems, this.checksStoreService.checkIdSearchQuery);

     checkIdInputDisplay = computed(() => {
          if (this.checksStoreService.checkIdSearchQuery()) {
               return this.checksStoreService.checkIdSearchQuery();
          }
          return this.checkIdDisplay();
     });

     filteredCheckIds = this.checkUtilService.filteredCheckItems(this.checkItems, this.checksStoreService.checkIdSearchQuery);

     selectedFullCheck = computed(() => {
          const selectedId = this.checksStoreService.checkIdField();
          if (!selectedId) return null;

          const tab = this.activeTab();

          if (tab === 'cashCheck') {
               return this.checksStoreService.cashableChecks().find(c => c.id === selectedId) ?? null;
          } else if (tab === 'cancelCheck') {
               return this.checksStoreService.cancellableChecks().find(c => c.id === selectedId) ?? null;
          }
          return null;
     });

     selectedCheckDestination = computed(() => this.selectedFullCheck()?.destination ?? '');

     selectedFullCheckForCash = computed(() => {
          const selectedId = this.checksStoreService.checkIdField();
          if (!selectedId) return null;

          return this.checksStoreService.cashableChecks().find(c => c.id === selectedId) ?? null;
     });

     selectedCheckCreator = computed(() => this.selectedFullCheckForCash()?.sender ?? '');

     selectedCheckIndex = computed(() => {
          return this.selectedFullCheckForCash()?.id ?? this.selectedFullCheck()?.id ?? '';
     });

     selectedCheckAmount = computed(() => {
          const check = this.selectedFullCheck();
          return check?.sendMax ? this.utilsService.formatIOUXrpAmountOutstanding(check.sendMax) : '';
     });

     isIOUCheck = computed(() => {
          const check = this.selectedFullCheck();
          if (!check?.sendMax) return false;
          return typeof check.sendMax === 'object' && 'currency' in check.sendMax;
     });

     selectedCheckIssuer = computed(() => {
          const check = this.selectedFullCheck();
          if (!check?.sendMax || typeof check.sendMax !== 'object') return '';
          return (check.sendMax as any).issuer ?? '';
     });

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return defaultText;
               return this.txUiService.stepMessage();
          });
     }

     readonly createCheckButtonLabel = this.buildTxLabel('Create Check');
     readonly cashCheckButtonLabel = this.buildTxLabel('Cash Check');
     readonly cancelCheckButtonLabel = this.buildTxLabel('Cancel Check');
}
