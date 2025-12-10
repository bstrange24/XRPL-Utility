import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from '../local-storage/storage.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';

interface IssuerItem {
     name: string;
     address: string;
}

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService {
     private knownTrustLinesIssuers: Record<string, string[]> = { XRP: [] };

     // Public observables
     currencies$ = new BehaviorSubject<string[]>([]);
     issuers$ = new BehaviorSubject<IssuerItem[]>([]);
     selectedIssuer$ = new BehaviorSubject<string>('');
     balance$ = new BehaviorSubject<string>('0'); // ← NEW: balance for currency + issuer

     private currentWalletAddress = signal<string>('');
     private currentCurrency = signal<string>('');
     private currentIssuer = signal<string>('');

     // Cache gateway balances per wallet (8 sec)
     private balanceCache = new Map<string, { data: any; timestamp: number }>();

     constructor(private storage: StorageService, private xrplService: XrplService, private utils: UtilsService, private walletManagerService: WalletManagerService) {
          this.loadFromStorage();
     }

     private loadFromStorage() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               // ← DEFENSIVE: Make sure every value is an array
               const normalized: Record<string, string[]> = {};
               for (const [currency, issuers] of Object.entries(data)) {
                    if (Array.isArray(issuers)) {
                         normalized[currency] = issuers;
                    } else if (issuers && typeof issuers === 'object') {
                         // Convert object { "0": "r...", "1": "r..." } → array
                         normalized[currency] = Object.values(issuers) as string[];
                    } else {
                         normalized[currency] = [];
                    }
               }
               normalized['XRP'] = []; // always ensure XRP exists

               this.knownTrustLinesIssuers = normalized;
               this.updateCurrencies();
          }
     }

     private loadFromStorage1() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers = data;
               this.updateCurrencies();
          }
     }

     getAvailableCurrencies(includeXrp: boolean = false): string[] {
          let currencies = Object.keys(this.knownTrustLinesIssuers);

          if (!includeXrp) {
               currencies = currencies.filter(c => c !== 'XRP');
          }

          return currencies.sort((a, b) => a.localeCompare(b));
     }

     private updateCurrencies() {
          const currencies = Object.keys(this.knownTrustLinesIssuers)
               .filter(c => c !== 'XRP')
               .sort((a, b) => a.localeCompare(b));
          this.currencies$.next(currencies);

          // Auto-select first currency if none selected
          if (currencies.length > 0 && !this.currentCurrency) {
               this.selectCurrency(currencies[0]);
          }
     }

     // Called when user picks a currency
     async selectCurrency(currency: string, walletAddress?: string) {
          if (!currency) {
               this.issuers$.next([]);
               this.selectedIssuer$.next('');
               this.balance$.next('0');
               return;
          }

          this.currentCurrency.set(currency);
          this.currentWalletAddress.set(walletAddress || this.currentWalletAddress());

          await this.loadIssuersForCurrency(currency);
          await this.updateBalanceForCurrentCombo();
     }

     // Called when user picks an issuer
     selectIssuer(issuer: string) {
          this.currentIssuer.set(issuer);
          this.selectedIssuer$.next(issuer);
          this.updateBalanceForCurrentCombo();
     }

     private async loadIssuersForCurrency(currency: string) {
          let known = this.knownTrustLinesIssuers[currency] || [];

          if (!Array.isArray(known)) {
               console.warn(`Corrupted issuer list for ${currency}, resetting`);
               known = [];
               this.knownTrustLinesIssuers[currency] = [];
          }

          const issuers: IssuerItem[] = known
               .map(addr => ({
                    name: this.getNiceName(addr, currency),
                    address: addr,
               }))
               .sort((a, b) => a.name.localeCompare(b.name));

          this.issuers$.next(issuers);

          if (issuers.length > 0 && (!this.currentIssuer() || !known.includes(this.currentIssuer()))) {
               this.selectIssuer(issuers[0].address);
          } else if (issuers.length === 0) {
               this.selectedIssuer$.next('');
               this.balance$.next('0');
          }
     }

     private async loadIssuersForCurrency1(currency: string) {
          const known = this.knownTrustLinesIssuers[currency] || [];
          const issuers: IssuerItem[] = known
               .map(addr => ({
                    name: this.getNiceName(addr, currency),
                    address: addr,
               }))
               .sort((a, b) => a.name.localeCompare(b.name));

          this.issuers$.next(issuers);

          // Auto-select first issuer
          if (issuers.length > 0 && (!this.currentIssuer || !known.includes(this.currentIssuer()))) {
               this.selectIssuer(issuers[0].address);
          } else if (issuers.length === 0) {
               this.selectedIssuer$.next('');
               this.balance$.next('0');
          }
     }

     private getNiceName(address: string, currency: string): string {
          // Try wallet name
          const wallet = this.walletManagerService.getWallets()?.find(w => w.address === address);
          if (wallet?.name) return wallet.name;

          // Try custom destinations
          const custom = this.storage.get('customDestinations');
          if (custom) {
               const list = JSON.parse(custom);
               const found = list.find((d: any) => d.address === address);
               if (found?.name) return found.name;
          }

          return `${currency} Issuer`;
     }

     // MAIN NEW FEATURE: Get balance for current currency + issuer
     private async updateBalanceForCurrentCombo() {
          if (!this.currentWalletAddress || !this.currentCurrency || !this.currentIssuer) {
               this.balance$.next('0');
               return;
          }

          const cacheKey = `${this.currentWalletAddress}_${this.currentCurrency}`;
          const cached = this.balanceCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 8000) {
               const balance = this.extractBalance(cached.data, this.currentCurrency(), this.currentIssuer());
               this.balance$.next(balance);
               return;
          }

          try {
               const client = await this.xrplService.getClient();
               // const wallet = await this.utils.getWalletFromAddress(this.currentWalletAddress);
               const gatewayBalances = await this.xrplService.getTokenBalance(client, this.currentWalletAddress(), 'validated', '');

               this.balanceCache.set(cacheKey, { data: gatewayBalances, timestamp: Date.now() });

               const balance = this.extractBalance(gatewayBalances, this.currentCurrency(), this.currentIssuer());
               this.balance$.next(balance);
          } catch (e) {
               console.warn('Failed to load balance for currency+issuer', e);
               this.balance$.next('0');
          }
     }

     private extractBalance(gatewayBalances: any, currency: string, issuer: string): string {
          const result = gatewayBalances.result;
          const normalized = this.utils.normalizeCurrencyCode(currency);

          // Check obligations (you are issuer)
          if (result.obligations?.[normalized]) {
               return `-${this.utils.formatTokenBalance(result.obligations[normalized], 18)}`;
          }

          // Check assets (others issued to you)
          if (result.assets?.[issuer]) {
               const asset = result.assets[issuer].find((a: any) => this.utils.normalizeCurrencyCode(a.currency) === normalized);
               if (asset) return this.utils.formatTokenBalance(asset.value, 18);
          }

          // Check balances (owed to you)
          if (result.balances?.[issuer]) {
               const bal = result.balances[issuer].find((b: any) => this.utils.normalizeCurrencyCode(b.currency) === normalized);
               if (bal) return this.utils.formatTokenBalance(bal.value, 18);
          }

          return '0';
     }

     // Public helpers
     getCurrencies(): string[] {
          return this.currencies$.value;
     }

     getSelectedCurrency(): string {
          return this.currentCurrency();
     }

     getSelectedIssuer(): string {
          return this.currentIssuer();
     }
}
