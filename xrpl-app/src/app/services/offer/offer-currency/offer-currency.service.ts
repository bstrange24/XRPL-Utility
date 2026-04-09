import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from '../../shared/local-storage/storage.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';

export interface IssuerItem {
     name: string;
     address: string;
}

export interface CurrencySideState {
     currency: ReturnType<typeof signal<string>>;
     issuer: ReturnType<typeof signal<string>>;
     issuers: ReturnType<typeof signal<IssuerItem[]>>;
     balance: ReturnType<typeof signal<string>>;
}

@Injectable({
     providedIn: 'root',
})
export class OfferCurrencyService {
     public readonly storage = inject(StorageService);
     public readonly xrplService = inject(XrplService);
     public readonly utils = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     private knownTrustLinesIssuers: Record<string, string[]> = { XRP: [] };

     public readonly weWant: CurrencySideState;
     public readonly weSpend: CurrencySideState;

     private walletAddress = '';

     // Cache per wallet+currency
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();

     constructor() {
          this.weWant = this.createSideState();
          this.weSpend = this.createSideState();
          this.loadKnownIssuersFromStorage();
     }

     private createSideState(): CurrencySideState {
          return {
               currency: signal(''),
               issuer: signal(''),
               issuers: signal<IssuerItem[]>([]),
               balance: signal('0'),
          };
     }

     private loadKnownIssuersFromStorage() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers = data;
          }
     }

     setWalletAddress(address: string) {
          this.walletAddress = address;
          this.balanceCache.clear();
     }

     getAvailableCurrencies(includeXrp = false): string[] {
          let currencies = Object.keys(this.knownTrustLinesIssuers);
          if (!includeXrp) {
               currencies = currencies.filter(c => c !== 'XRP');
          }
          return currencies.sort((a, b) => a.localeCompare(b));
     }

     // ===== WE WANT =====
     selectWeWantCurrency(currency: string, currentWallet: any) {
          this.weWant.currency.set(currency);
          this.loadIssuersForSide(currency, this.weWant);
          this.updateBalanceForSide(this.weWant, currentWallet);
     }

     selectWeWantIssuer(issuer: string, currentWallet: any) {
          this.weWant.issuer.set(issuer);
          this.updateBalanceForSide(this.weWant, currentWallet);
     }

     // ===== WE SPEND =====
     selectWeSpendCurrency(currency: string, currentWallet: any) {
          this.weSpend.currency.set(currency);
          this.loadIssuersForSide(currency, this.weSpend);
          this.updateBalanceForSide(this.weSpend, currentWallet);
     }

     selectWeSpendIssuer(issuer: string, currentWallet: any) {
          this.weSpend.issuer.set(issuer);
          this.updateBalanceForSide(this.weSpend, currentWallet);
     }

     private async loadIssuersForSide(currency: string, side: CurrencySideState) {
          if (!currency || currency === 'XRP') {
               side.issuers.set([]);
               side.issuer.set('');
               return;
          }

          const known = this.knownTrustLinesIssuers[currency] || [];

          const issuers: IssuerItem[] = known
               .map(addr => ({
                    name: this.getNiceName(addr, currency),
                    address: addr,
               }))
               .sort((a, b) => a.name.localeCompare(b.name));

          side.issuers.set(issuers);

          if (issuers.length > 0 && !side.issuer()) {
               side.issuer.set(issuers[0].address);
          }
     }

     private getNiceName(address: string, currency: string): string {
          const wallet = this.walletManagerService.wallets()?.find(w => w.address === address);
          if (wallet?.name) return wallet.name;

          const custom = this.storage.get('customDestinations');
          if (custom) {
               try {
                    const list = JSON.parse(custom);
                    const found = list.find((d: any) => d.address === address);
                    if (found?.name) return found.name;
               } catch {}
          }

          return `${currency} Issuer`;
     }

     private async updateBalanceForSide(side: CurrencySideState, currentWallet: any) {
          const currency = side.currency();
          const issuer = side.issuer();

          if (!this.walletAddress || !currency || currency === 'XRP' || !issuer) {
               side.balance.set(currency === 'XRP' ? currentWallet.balance : '0');
               return;
          }

          const cacheKey = `${this.walletAddress}_${currency}`;
          const cached = this.balanceCache.get(cacheKey);

          if (cached && Date.now() - cached.timestamp < 8000) {
               const balance = this.extractBalance(cached.data, currency, issuer);
               side.balance.set(balance);
               return;
          }

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utils.getWalletFromAddress(this.walletAddress);

               const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

               this.balanceCache.set(cacheKey, {
                    data: gatewayBalances,
                    timestamp: Date.now(),
               });

               const balance = this.extractBalance(gatewayBalances, currency, issuer);
               side.balance.set(balance);
          } catch (e) {
               console.warn('Failed to load balance', e);
               side.balance.set('0');
          }
     }

     private extractBalance(gatewayBalances: any, currency: string, issuer: string): string {
          const result = gatewayBalances.result;
          const normalized = this.utils.normalizeCurrencyCode(currency);

          if (result.obligations?.[normalized]) {
               return `-${this.utils.formatTokenBalance(result.obligations[normalized], 18)}`;
          }

          if (result.assets?.[issuer]) {
               const asset = result.assets[issuer].find((a: any) => this.utils.normalizeCurrencyCode(a.currency) === normalized);
               if (asset) return this.utils.formatTokenBalance(asset.value, 18);
          }

          if (result.balances?.[issuer]) {
               const bal = result.balances[issuer].find((b: any) => this.utils.normalizeCurrencyCode(b.currency) === normalized);
               if (bal) return this.utils.formatTokenBalance(bal.value, 18);
          }

          return '0';
     }

     async refreshBothBalances(currentWallet: any) {
          await Promise.all([this.updateBalanceForSide(this.weWant, currentWallet), this.updateBalanceForSide(this.weSpend, currentWallet)]);
     }

     getIssuersForCurrency(currency: string): string[] {
          if (!currency || currency === 'XRP') return [];
          return this.knownTrustLinesIssuers[currency] || [];
     }

     reset() {
          this.weWant.currency.set('');
          this.weWant.issuer.set('');
          this.weWant.issuers.set([]);
          this.weWant.balance.set('0');

          this.weSpend.currency.set('');
          this.weSpend.issuer.set('');
          this.weSpend.issuers.set([]);
          this.weSpend.balance.set('0');
     }
}
