import { computed, inject, Injectable, signal } from '@angular/core';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineActionTypes } from '../../../components/trustlines/constants/trustline.types';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';

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

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();

     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());
     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.currencyStoreService.currency()) ?? null);
     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.currencyStoreService.issuer()) ?? null);

     readonly infoData = computed(() => {
          const wallet = this.walletManager.getSelectedWallet();
          if (!wallet?.address) return '';

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;
          const isIssuer = this.isIssuerForSelected();

          const allTrustlines = this.trustlineStoreService.existingIOUs() ?? [];
          const tab = this.activeTab();

          if (this.trustlineStoreService.isLoading()) {
               return {
                    walletName,
                    activeTab: tab,
                    trustlineCount: 0,
                    totalTrustlines: allTrustlines.length,
                    trustlinesToShow: [],
                    links: '',
                    countText: 'trustlines',
                    emptyMessage: 'Loading trustlines...',
                    helpHint: null,
                    isEmpty: true,
                    isLoading: true,
               };
          }

          // ── Normal filtering (exactly the same as before) ──
          let relevant: typeof allTrustlines = [];
          let countText = '';
          let emptyMessage = '';
          let helpHint: string | null = null;

          switch (tab) {
               case 'setTrustline': {
                    relevant = allTrustlines;
                    countText = 'existing trustlines';
                    break;
               }
               case 'removeTrustline': {
                    relevant = allTrustlines.filter((tl: { balance: any; limit: any; flags: string[] }) => {
                         const bal = Number(tl.balance);
                         const lim = Number(tl.limit);
                         const frozen = tl.flags?.some((f: string) => f.includes('Freeze'));
                         const needsClearNoRipple = tl.flags?.includes('NoRipple') && !this.trustlineCurrencyService.flags().tfClearNoRipple;

                         return bal === 0 && lim === 0 && !frozen && !needsClearNoRipple;
                    });
                    countText = 'removable trustlines';
                    break;
               }
               case 'issueCurrency': {
                    if (isIssuer) {
                         // Issuer → show obligations (negative balances)
                         relevant = allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) < 0);
                         countText = isIssuer ? 'issuable currencies' : 'sendable balances';

                         if (allTrustlines.length === 0) {
                              emptyMessage = 'No trustlines found for this wallet.';
                              helpHint = 'You must have trustlines before issuing tokens.';
                         } else if (relevant.length === 0) {
                              emptyMessage = 'You are not currently issuing any tokens.';
                              helpHint = 'Issue tokens to a destination to create supply.';
                         }
                    } else {
                         // Holder → show positive balances (what you can send)
                         relevant = allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) > 0);
                         countText = 'currencies you can send';

                         if (allTrustlines.length === 0) {
                              emptyMessage = 'No trustlines found for this wallet.';
                              helpHint = 'You need a trustline and balance to send tokens.';
                         } else if (relevant.length === 0) {
                              emptyMessage = 'You do not hold any tokens to send.';
                              helpHint = 'Receive tokens first or check another currency.';
                         }
                    }

                    break;
               }
               case 'clawbackTokens': {
                    if (!isIssuer) {
                         // Not issuer → cannot use clawback at all
                         relevant = [];
                         countText = 'clawback-eligible currencies';
                         emptyMessage = 'Clawback is only available to the issuer of a currency.';
                         helpHint = 'Switch to the issuing wallet to claw back tokens.';
                         break;
                    }

                    // Issuer → show negative balances (issued tokens)
                    relevant = allTrustlines.filter((tl: { balance: any }) => Number(tl.balance) < 0);
                    countText = 'currencies you can clawback';

                    if (allTrustlines.length === 0) {
                         emptyMessage = 'No trustlines found for this wallet.';
                         helpHint = 'You must issue tokens before they can be clawed back.';
                    } else if (relevant.length === 0) {
                         emptyMessage = 'No issued tokens available to claw back.';
                         helpHint = 'Clawback applies only to tokens you have issued.';
                    }

                    break;
               }
               case 'addNewIssuers': {
                    relevant = allTrustlines;
                    countText = 'saved trustlines';
                    break;
               }
               default:
                    relevant = allTrustlines;
                    countText = 'trustlines';
          }

          const totalCount = allTrustlines.length;
          const filteredCount = relevant.length;

          // Empty messages (your existing logic)
          if (totalCount === 0) {
               emptyMessage = 'No trustlines found for this wallet.';
               helpHint = 'Start by adding or setting a trustline.';
          } else if (filteredCount === 0) {
               switch (tab) {
                    case 'removeTrustline':
                         emptyMessage = 'No trustlines are currently eligible for removal.';
                         helpHint = '';
                         break;

                    case 'issueCurrency':
                         emptyMessage = 'You are not an issuer of the selected currency/issuer pair. ';
                         helpHint = '';
                         break;

                    case 'clawbackTokens':
                         emptyMessage = 'No clawback-enabled currencies found.';
                         helpHint = '';
                         break;

                    case 'setTrustline':
                         emptyMessage = 'No existing trustlines.';
                         helpHint = 'You can create a new trustline below.';
                         break;

                    default:
                         emptyMessage = 'No matching trustlines found.';
               }
          }
          const links = totalCount > 0 ? `<a href="${explorerBase}account/${address}/tokens" target="_blank" class="xrpl-win-link">View on explorer</a>` : '';

          return {
               walletName,
               activeTab: tab,
               trustlineCount: filteredCount || 0,
               totalTrustlines: totalCount,
               trustlinesToShow: relevant.map((tl: any) => ({
                    currency: tl.currency,
                    issuer: tl.issuer,
                    balance: tl.balance,
                    limit: tl.limit,
                    flags: tl.flags || [],
               })),
               links,
               countText,
               emptyMessage,
               helpHint,
               isEmpty: filteredCount === 0,
               isLoading: false,
          };
     });

     readonly isIssuerForSelected = computed(() => {
          const walletAddr = this.walletManager.getSelectedWallet()?.address?.toLowerCase().trim();
          if (!walletAddr) return false;

          // Get the *currently active* issuer from the dropdown / service
          // This ensures it's the one the user has selected right now
          const activeIssuer = this.selectedIssuerItem()?.id?.toLowerCase().trim();

          // Fallback: if no dropdown item selected yet, use the service's raw value
          const fallbackIssuer = this.currencyStoreService.issuer()?.toLowerCase().trim();

          const currentIssuer = activeIssuer || fallbackIssuer || '';

          return walletAddr === currentIssuer;
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

          // Remove tab always shows the real per-trustline balance
          if (tab === 'removeTrustline') return this.foundTrustline()?.balance ?? '0';

          // Issuer case → use the total obligations from gateway_balances
          if (this.isIssuerForSelected()) return this.currencyStoreService.balance() || '0';

          // Normal holder case → use the per-trustline balance from existingIOUs
          const existing = this.foundTrustline();
          return existing ? existing.balance : '0';
     });

     // Helper to find current selected trustline (null if none)
     private readonly foundTrustline = computed(() => {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return null;

          return this.trustlineStoreService.currentTrustline(currency, issuer);
     });

     // Amount displayed/used in the form field
     readonly formAmount = computed(() => {
          const tab = this.activeTab();

          if (tab === 'issueCurrency' || tab === 'clawbackTokens') return '';

          if (tab === 'removeTrustline') return this.foundTrustline()?.limit ?? '0';

          const existing = this.foundTrustline();
          if (existing) return existing.limit;

          return '';
     });

     readonly isAmountReadOnly = computed(() => {
          const tab = this.activeTab();
          return tab === 'removeTrustline' || (tab === 'setTrustline' && this.trustlineStoreService.trustlineAlreadyExist());
     });

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for ledger validation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly trustlineSetButtonLabel = this.buildTxLabel('Set Trustline');
     readonly trustlineRemoveButtonLabel = this.buildTxLabel('Remove Trustline');
     readonly issueCurrencyButtonLabel = this.buildTxLabel('Issue Currency');
     readonly clawbackButtonLabel = this.buildTxLabel('Clawback Tokens');
     readonly addCurrencyIssuerButtonLabel = this.buildTxLabel('Add Currency/Issuer');
     readonly removeSelectedIssuerButtonLabel = this.buildTxLabel('Remove Selected Issuer');
}
