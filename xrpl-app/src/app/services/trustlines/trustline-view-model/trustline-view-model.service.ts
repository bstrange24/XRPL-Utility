import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineActionTypes } from '../../../components/trustlines/constants/trustline.types';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import Decimal from 'decimal.js';

@Injectable({
     providedIn: 'root',
})
export class TrustlineViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly txUiService = inject(TransactionUiService);
     readonly activeTab = signal<TrustlineActionTypes>('setTrustline');
     readonly isBusy = computed(() => this.txUiService.currentStep() !== 'idle');
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);

     constructor() {}

     readonly currencyItems = this.trustlineCurrencyService.currencyItems;
     readonly issuerItems = this.trustlineCurrencyService.issuerItems;
     readonly currencyBalanceField = this.currencyStoreService.balance();

     readonly selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.currencyStoreService.currency()) ?? null);
     readonly selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());
     readonly selectedIssuerItem = computed(() => {
          const issuerAddr = this.currencyStoreService.issuer();
          if (!issuerAddr) return null;

          const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;

          // Self issuer case
          if (currentWallet && issuerAddr === currentWallet) {
               return {
                    id: issuerAddr,
                    display: 'Self (Issuer)',
                    secondary: issuerAddr.slice(0, 8) + '...' + issuerAddr.slice(-4),
                    isSelf: true,
                    isCurrentAccount: true,
               } as any;
          }

          // Normal case
          const found = this.issuerItems().find(i => i.id === issuerAddr);
          return found ?? null;
     });

     // Improved self check (already good, but make sure it's used)
     readonly isSelfTrustline = computed(() => {
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress?.toLowerCase();
          const issuer = this.currencyStoreService.issuer()?.toLowerCase();
          return !!(walletAddr && issuer && walletAddr === issuer);
     });

     // Make sure this also respects self
     readonly isIssuerForSelected = computed(() => {
          return this.isSelfTrustline(); // reuse the reliable one
     });

     private readonly filteredTrustlines = computed(() => {
          const allTrustlines = this.trustlineStoreService.existingIOUs() ?? [];
          if (allTrustlines.length === 0) return [];

          const tab = this.activeTab();
          const isIssuer = this.isIssuerForSelected();

          switch (tab) {
               case 'setTrustline':
               case 'addNewIssuers':
                    return allTrustlines;
               case 'removeTrustline':
                    return this.removableTrustlines(); // Already optimized
               case 'issueCurrency':
                    return isIssuer ? allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) < 0) : allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) > 0);
               case 'clawbackTokens':
                    return isIssuer ? allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) < 0) : [];
               default:
                    return allTrustlines;
          }
     });

     readonly doesTrustlineExist = computed(() => {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          const existingIOUs = this.trustlineStoreService.existingIOUs();

          if (!currency || !issuer) return false;

          return existingIOUs.some((tl: any) => tl.currency === currency && tl.issuer === issuer);
     });

     readonly trustlinesToShow = computed(() => {
          const allTrustlines = this.trustlineStoreService.existingIOUs() ?? [];

          // For summary, always show all trustlines with basic info
          return allTrustlines.map((tl: any) => ({
               currency: tl.currency,
               issuer: tl.issuer,
               balance: tl.balance,
               limit: new Decimal(tl.limit).toFixed(), //tl.limit,
               flags: tl.flags || [],
          }));
     });

     private readonly removableTrustlines = computed(() => {
          const allTrustlines = this.trustlineStoreService.existingIOUs() ?? [];
          const clearNoRipple = this.trustlineCurrencyService.flags().tfClearNoRipple;
          return allTrustlines.filter((tl: any) => {
               const bal = Number(tl.balance);
               const lim = Number(tl.limit);
               const frozen = tl.flags?.some((f: string) => f.includes('Freeze'));
               const needsClearNoRipple = tl.flags?.includes('NoRipple') && !clearNoRipple;
               return bal === 0 && lim === 0 && !frozen && !needsClearNoRipple;
          });
     });

     readonly infoData = computed(() => {
          const wallet = this.walletManager.getSelectedWallet();
          const tab = this.activeTab();

          if (!wallet?.address || this.trustlineStoreService.isLoading()) {
               return {
                    walletName: wallet?.name || wallet?.address?.slice(0, 10) + '...' || 'Loading...',
                    classicAddress: wallet?.classicAddress || wallet?.address || '',
                    activeTab: tab,
                    trustlineCount: 0,
                    totalTrustlines: 0,
                    trustlinesToShow: [],
                    links: '',
                    countText: 'trustlines',
                    emptyMessage: ' Loading trustlines...',
                    helpHint: null,
                    isEmpty: true,
                    isLoading: true,
               };
          }

          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;
          const walletName = wallet.name || address.slice(0, 10) + '...';
          const allTrustlines = this.trustlineStoreService.existingIOUs() ?? [];
          const totalCount = allTrustlines.length;

          // For summary, show ALL trustlines (not filtered)
          const trustlinesToShow = allTrustlines.map((tl: any) => ({
               currency: tl.currency,
               issuer: tl.issuer,
               balance: tl.balance,
               limit: tl.limit,
               flags: tl.flags || [],
          }));

          let countText = '';
          let emptyMessage = '';
          let helpHint: string | null = null;

          switch (tab) {
               case 'setTrustline':
                    countText = 'existing trustlines';
                    break;

               case 'removeTrustline':
               case 'issueCurrency':
               case 'clawbackTokens':
               default:
                    countText = 'trustlines';
                    break;
          }

          // Common logic for empty state (outside the switch)
          if (totalCount === 0) {
               emptyMessage = ' No trustlines found for this wallet.';
               helpHint = '';
          }

          const links = totalCount > 0 ? `<a href="${explorerBase}account/${address}/tokens" target="_blank" class="xrpl-win-link">View on explorer</a>` : '';

          return {
               walletName,
               activeTab: tab,
               trustlineCount: totalCount,
               totalTrustlines: totalCount,
               trustlinesToShow,
               links,
               countText,
               emptyMessage,
               helpHint,
               isEmpty: totalCount === 0,
               isLoading: false,
          };
     });

     readonly actionButtonLabel = computed(() => {
          if (this.isIssuerForSelected()) return 'Issue Tokens';
          else return 'Send Tokens';
     });

     readonly formTitle = computed(() => {
          return this.isIssuerForSelected() ? 'Issue new tokens to destination' : 'Send held tokens to destination';
     });

     readonly hintText = computed(() => {
          if (this.isIssuerForSelected()) return 'You are the issuer — this will increase the total supply of this currency.';
          else return 'You are sending tokens you already hold — not creating them.';
     });

     readonly isSplitLayout = computed(() => this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline');

     readonly isPairedLayout = computed(() => this.activeTab() === 'issueCurrency' || this.activeTab() === 'clawbackTokens');

     readonly currencyLayout = computed<'split' | 'paired'>(() => {
          const tab = this.activeTab();
          if (tab === 'setTrustline' || tab === 'removeTrustline') return 'split';
          if (tab === 'issueCurrency' || tab === 'clawbackTokens') return 'paired';
          return 'paired';
     });

     readonly displayedTrustLimit = computed(() => {
          const tab = this.activeTab();
          const existing = this.foundTrustline();

          if (tab === 'removeTrustline') return existing ? existing.limit : '0';

          if (existing) return existing.limit;

          return '';
     });

     readonly displayedBalance = computed(() => {
          const tab = this.activeTab();
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          const balance = this.currencyStoreService.balance();
          const existingIOUs = this.trustlineStoreService.existingIOUs();

          const _forceRecompute = `${currency}|${issuer}|${balance}|${existingIOUs.length}`;

          // Remove tab always shows the real per-trustline balance
          if (tab === 'removeTrustline') {
               const trustline = this.foundTrustline();
               return trustline?.balance ?? '0';
          }

          // Issuer case → use the total obligations from gateway_balances
          if (this.isIssuerForSelected()) {
               return balance || '0';
          }

          // Normal holder case → use the per-trustline balance from existingIOUs
          const existing = this.foundTrustline();
          return existing ? existing.balance : '0';
     });

     readonly canRemoveTrustline = computed(() => {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          const existingIOUs = this.trustlineStoreService.existingIOUs();

          if (!currency || !issuer) {
               return { canRemove: false, reasons: ['No currency or issuer selected'] };
          }

          const trustline = existingIOUs.find((tl: any) => tl.currency === currency && tl.issuer === issuer);

          if (!trustline) {
               return { canRemove: false, reasons: ['No trustline exists for this currency/issuer pair'] };
          }

          const balance = typeof trustline.balance === 'string' ? Number.parseFloat(trustline.balance) : Number(trustline.balance);
          const limit = typeof trustline.limit === 'string' ? Number.parseFloat(trustline.limit) : Number(trustline.limit);
          const reasons: string[] = [];

          if (balance !== 0) reasons.push(`Balance is ${trustline.balance} (must be 0 to remove)`);
          // if (limit !== 0) reasons.push(`Limit is ${trustline.limit} (must be 0 to remove)`);
          if (trustline.flags?.includes('Freeze')) reasons.push(`Trustline is frozen`);
          // if (trustline.flags?.includes('NoRipple')) reasons.push(`NoRipple flag must be cleared first`);

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
     });

     async forceRefreshBalance(): Promise<void> {
          await this.trustlineCurrencyService.refreshCurrentBalance();
          // Trigger recomputation
          this.currencyStoreService.setField('balance', this.currencyStoreService.balance());
     }

     private readonly foundTrustline = computed(() => {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return null;

          return this.trustlineStoreService.currentTrustline(currency, issuer);
     });

     readonly formAmount = computed(() => {
          const tab = this.activeTab();
          const existing = this.foundTrustline();

          if (tab === 'removeTrustline') {
               return existing?.limit ?? '0';
          }

          if (existing) {
               return existing.limit;
          }

          return this.currencyStoreService.amount() ?? '';
     });

     readonly isAmountReadOnly = computed(() => {
          const tab = this.activeTab();
          return tab === 'removeTrustline' || (tab === 'setTrustline' && this.trustlineStoreService.trustlineAlreadyExist());
     });

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return defaultText;
               return this.txUiService.stepMessage();
          });
     }

     readonly trustlineSetButtonLabel = this.buildTxLabel('Set Trustline');
     readonly trustlineRemoveButtonLabel = this.buildTxLabel('Remove Trustline');
     readonly issueCurrencyButtonLabel = this.buildTxLabel('Issue Currency');
     readonly clawbackButtonLabel = this.buildTxLabel('Clawback Tokens');
     readonly addCurrencyIssuerButtonLabel = this.buildTxLabel('Add Currency/Issuer');
     readonly removeSelectedIssuerButtonLabel = this.buildTxLabel('Remove Selected Issuer');

     readonly shouldShowAlreadyExistsWarning = computed(() => this.activeTab() === 'setTrustline' && this.trustlineStoreService.trustlineAlreadyExist() && !this.isSelfTrustline());

     readonly shouldShowSelfWarning = computed(() => this.activeTab() === 'setTrustline' && this.isSelfTrustline());

     readonly shouldShowExistsWarning = computed(() => this.activeTab() === 'setTrustline' && this.trustlineStoreService.trustlineAlreadyExist() && !this.isSelfTrustline());
}
