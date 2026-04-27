import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { OfferActionTypes } from '../../../components/offer/constants/offer.types';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { OfferStoreService } from '../offer-store/offer-store.service';
import { IssuerItem, OfferCurrencyService } from '../offer-currency/offer-currency.service';

@Injectable({
     providedIn: 'root',
})
export class OfferTransactionViewModelService {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly offerCurrency = inject(OfferCurrencyService);

     readonly activeTab = signal<OfferActionTypes>('createOffer');
     readonly weWantIssuersTrigger = signal(0);
     readonly weSpendIssuersTrigger = signal(0);
     readonly weWantCurrency = signal<string>('');
     readonly weWantIssuer = signal<string>('');
     readonly weSpendCurrency = signal<string>('XRP');
     readonly weSpendIssuer = signal<string>('');
     // User balances for the selected pool assets
     readonly weWantUserBalance = computed(() => this.offerCurrency.weWant.balance());
     readonly weSpendUserBalance = computed(() => this.offerCurrency.weSpend.balance());

     constructor() {
          effect(() => {
               const issuer = this.weWantIssuer();
               if (issuer) {
                    const wallet = this.walletManagerService.getSelectedWallet();
                    if (wallet) this.offerCurrency.selectWeWantIssuer(issuer, wallet); // will refresh balance
               }
          });
     }

     readonly weWantCurrencyItems = computed(() => {
          this.weWantCurrency();
          return this.offerCurrency.getAvailableCurrencies(true).map(curr => ({
               id: curr,
               display: curr === 'XRP' ? 'XRP' : curr,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.offerCurrency.getIssuersForCurrency(curr).length;
                                return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                           })(),
          }));
     });

     readonly selectedWeWantCurrencyItem = computed(() => {
          const code = this.weWantCurrency();
          if (!code) return null;
          return this.weWantCurrencyItems().find(i => i.id === code) ?? null;
     });

     readonly weSpendCurrencyItems = computed(() => {
          this.weSpendCurrency();
          return this.offerCurrency.getAvailableCurrencies(true).map(curr => ({
               id: curr,
               display: curr === 'XRP' ? 'XRP' : curr,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.offerCurrency.getIssuersForCurrency(curr).length;
                                return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                           })(),
          }));
     });

     readonly selectedWeSpendCurrencyItem = computed(() => {
          const code = this.weSpendCurrency();
          if (!code) return null;
          return this.weSpendCurrencyItems().find(i => i.id === code) ?? null;
     });

     readonly weWantIssuerItems = computed(() => {
          this.weWantIssuersTrigger();
          const issuers = this.offerCurrency.weWant.issuers() ?? [];
          return issuers.map((iss: IssuerItem, i: number) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
          }));
     });

     readonly selectedWeWantIssuerItem = computed(() => {
          const addr = this.offerCurrency.weWant.issuer(); // ← Read directly from source
          if (!addr) return null;

          const items = this.weWantIssuerItems();
          const item = items.find(i => i.id === addr);

          console.log(`selectedWeWantIssuerItem for ${this.weWantCurrency()}:`, addr, item ? '✅ FOUND' : '❌ NOT FOUND');
          return item ?? null;
     });

     readonly weSpendIssuerItems = computed(() => {
          this.weSpendIssuersTrigger();
          const issuers = this.offerCurrency.weSpend.issuers() ?? [];
          return issuers.map((iss: IssuerItem, i: number) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
          }));
     });

     readonly selectedWeSpendIssuerItem = computed(() => {
          const addr = this.offerCurrency.weSpend.issuer(); // ← Read directly from source
          if (!addr) return null;

          const items = this.weSpendIssuerItems();
          const item = items.find(i => i.id === addr);

          console.log(`selectedWeSpendIssuerItem for ${this.weSpendCurrency()}:`, addr, item ? '✅ FOUND' : '❌ NOT FOUND');
          return item ?? null;
     });

     readonly infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const offers = this.offerStoreService.existingOffers();
          const offerCount = offers.length;

          const stats = this.offerStoreService.orderBookStats();
          const pair = this.offerStoreService.orderBookPair();

          const base = {
               walletName,
               offerCount,
               isOrderBookTab: this.activeTab() === 'getOrderBook',
               offersToShow: offers.map((offer: any) => {
                    const pays = this.formatAmount(offer.TakerPays);
                    const gets = this.formatAmount(offer.TakerGets);

                    return {
                         index: offer.TxHash,
                         takerGets: `${gets.value} ${gets.currency}`,
                         takerPays: `${pays.value} ${pays.currency}`,
                         issuer: pays.issuer,
                         flags: this.decodeOfferFlags(offer.Flags),
                    };
               }),
          };

          return {
               ...base,
               pair: pair ?? '',
               stats: stats ?? {
                    vwap: 0,
                    simpleAvg: 0,
                    bestRate: 0,
                    spread: 0,
                    spreadPercent: 0,
                    liquidityRatio: 0,
                    depth: 'N/A',
                    execution: 'N/A',
                    volatility: 'N/A',
               },
          };
     });

     formatAmount = (amount: any) => {
          if (!amount) return { value: '0', currency: '', issuer: '' };

          if (amount.split(' ').length === 1) {
               return {
                    value: amount,
                    currency: 'XRP',
                    issuer: '',
               };
          } else {
               return {
                    value: amount.split(' ')[0],
                    currency: amount.split(' ')[1],
                    issuer: amount.split(' ')[2],
               };
          }
     };

     private decodeOfferFlags(flags: number): string[] {
          const decoded: string[] = [];
          if ((flags & 0x00010000) !== 0) decoded.push('tfPassive');
          if ((flags & 0x00020000) !== 0) decoded.push('tfImmediateOrCancel');
          if ((flags & 0x00040000) !== 0) decoded.push('tfFillOrKill');
          if ((flags & 0x00080000) !== 0) decoded.push('tfSell');
          return decoded.length ? decoded : ['None'];
     }
}
