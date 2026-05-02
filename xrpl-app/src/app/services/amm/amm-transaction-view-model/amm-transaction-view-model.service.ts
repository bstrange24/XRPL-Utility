import { computed, inject, Injectable, signal } from '@angular/core';
import { AmmActionTypes } from '../../../components/amm/constants/amm.types';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { OfferCurrencyService } from '../../offer/offer-currency/offer-currency.service';

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionViewModelService {
     public readonly xrplCacheService = inject(XrplCacheService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly offerCurrency = inject(OfferCurrencyService);

     readonly activeTab = signal<AmmActionTypes>('createAMM');

     // Pool 1 (weWant)
     readonly pool1Currency = signal<string>('');
     readonly pool1Issuer = signal<string>('');
     readonly pool1IssuersTrigger = signal(0);

     // Pool 2 (weSpend)
     readonly pool2Currency = signal<string>('XRP');
     readonly pool2Issuer = signal<string>('');
     readonly pool2IssuersTrigger = signal(0);

     // User balances for the selected pool assets
     readonly asset1UserBalance = computed(() => this.offerCurrency.weWant.balance());
     readonly asset2UserBalance = computed(() => this.offerCurrency.weSpend.balance());

     // Pool 1 currency dropdown
     pool1CurrencyItems = computed(() => {
          this.pool1Currency(); // reactive trigger
          return this.offerCurrency.getAvailableCurrencies(true).map(curr => ({
               id: curr,
               display: curr,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.offerCurrency.getIssuersForCurrency(curr).length;
                                if (count === 0) {
                                     return 'No issuers';
                                }

                                const plural = count === 1 ? '' : 's';
                                return `${count} issuer${plural}`;
                           })(),
          }));
     });

     selectedPool1CurrencyItem = computed(() => {
          const code = this.pool1Currency();
          return this.pool1CurrencyItems().find(i => i.id === code) ?? null;
     });

     // Pool 1 issuer dropdown
     pool1IssuerItems = computed(() => {
          this.pool1IssuersTrigger();
          return (this.offerCurrency.weWant.issuers() ?? []).map((iss, i) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
          }));
     });

     selectedPool1IssuerItem = computed(() => {
          const addr = this.pool1Issuer();
          return this.pool1IssuerItems().find(i => i.id === addr) ?? null;
     });

     // Pool 2 currency dropdown (currently XRP only)
     pool2CurrencyItems = computed(() => [
          {
               id: 'XRP',
               display: 'XRP',
               secondary: 'Native currency',
          },
     ]);

     selectedPool2CurrencyItem = computed(() => this.pool2CurrencyItems()[0] ?? null);

     // Pool 2 issuer dropdown
     pool2IssuerItems = computed(() => {
          this.pool2IssuersTrigger();
          return (this.offerCurrency.weSpend.issuers() ?? []).map((iss, i) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
          }));
     });

     selectedPool2IssuerItem = computed(() => {
          const addr = this.pool2Issuer();
          return this.pool2IssuerItems().find(i => i.id === addr) ?? null;
     });
}
