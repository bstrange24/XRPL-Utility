import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';
import { StorageService } from '../local-storage/storage.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';

interface IssuerItem {
     name: string;
     address: string;
}

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService {
     private knownTrustLinesIssuers: Record<string, string[]> = { XRP: [] };

     // Public observables
     private readonly destroy$ = new Subject<void>();
     private readonly currentWalletAddress = signal<string>('');
     private readonly currentCurrency = signal<string>('');
     private readonly currentIssuer = signal<string>('');
     // Cache gateway balances per wallet (8 sec)
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();

     // Keep track of current wallet from streams
     private latestWallets: Wallet[] = [];
     private latestSelectedIndex = 0;

     currencies$ = new BehaviorSubject<string[]>([]);
     issuers$ = new BehaviorSubject<IssuerItem[]>([]);
     selectedIssuer$ = new BehaviorSubject<string>('');
     balance$ = new BehaviorSubject<string>('0');

     constructor(private readonly storage: StorageService, private readonly xrplService: XrplService, private readonly utils: UtilsService, private readonly walletManagerService: WalletManagerService) {
          this.loadFromStorage();

          // Subscribe to both streams and derive current wallet
          combineLatest([this.walletManagerService.wallets$, this.walletManagerService.selectedIndex$])
               .pipe(takeUntil(this.destroy$))
               .subscribe(([wallets, selectedIndex]) => {
                    this.latestWallets = wallets;
                    this.latestSelectedIndex = selectedIndex;

                    if (wallets.length === 0 || selectedIndex < 0 || selectedIndex >= wallets.length) {
                         this.currentWalletAddress.set('');
                         this.clearCurrentSelection();
                         return;
                    }

                    const currentWallet = wallets[selectedIndex];
                    if (currentWallet.address !== this.currentWalletAddress()) {
                         this.currentWalletAddress.set(currentWallet.address);
                         this.clearCurrentSelection();

                         // If a currency was already selected, refresh issuers + balance
                         if (this.currentCurrency) {
                              this.loadIssuersForCurrency(this.currentCurrency());
                              this.updateBalanceForCurrentCombo();
                         }
                    }
               });
     }

     private clearCurrentSelection() {
          this.currentCurrency.set('');
          this.currentIssuer.set('');
          this.selectedIssuer$.next('');
          this.balance$.next('0');
     }

     public loadFromStorage() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               // ← DEFENSIVE: Make sure every value is an array
               const normalized: Record<string, string[]> = {};
               for (const [currency, issuers] of Object.entries(data)) {
                    if (Array.isArray(issuers)) {
                         normalized[currency] = issuers;
                    } else if (issuers && typeof issuers === 'object') {
                         // Convert object { "0": "r...", "1": "r..." } → array
                         normalized[currency] = Object.values(issuers);
                    } else {
                         normalized[currency] = [];
                    }
               }
               normalized['XRP'] = []; // always ensure XRP exists

               this.knownTrustLinesIssuers = normalized;
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

          // Auto-select first currency
          if (currencies.length > 0 && !this.currentCurrency()) {
               this.selectCurrency(currencies[0]); // ← CHANGE THIS LINE
          }
     }

     async selectCurrency(currency: string, nothing?: string) {
          if (!currency || currency === 'XRP') {
               this.currentCurrency.set('');
               this.currentIssuer.set('');
               this.issuers$.next([]);
               this.selectedIssuer$.next('');
               this.balance$.next('0');
               return;
          }

          this.currentCurrency.set(currency);

          // Get current wallet address from the combined stream above
          // Use latest known wallet
          if (this.latestWallets.length === 0 || this.latestSelectedIndex >= this.latestWallets.length) {
               this.currentWalletAddress.set('');
               this.balance$.next('0');
               return;
          }

          const currentWallet = this.latestWallets[this.latestSelectedIndex];
          this.currentWalletAddress.set(currentWallet.address);

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
          const known = this.knownTrustLinesIssuers[currency] || [];
          const issuers: IssuerItem[] = known
               .map(addr => ({
                    name: this.getNiceName(addr, currency),
                    address: addr,
               }))
               .sort((a, b) => a.name.localeCompare(b.name));

          this.issuers$.next(issuers);

          if (issuers.length === 0) {
               this.currentIssuer.set('');
               this.selectedIssuer$.next('');
               this.balance$.next('0');
               return;
          }

          // 1. If we already have a selected issuer for this currency → keep it
          // 2. Otherwise, default to the first one (only on first load)
          const previouslySelectedForThisCurrency = this.currentIssuer() && known.includes(this.currentIssuer());

          if (!previouslySelectedForThisCurrency) {
               // First time seeing this currency → pick the first issuer
               this.currentIssuer.set(issuers[0].address);
          }

          // Always emit the current (possibly unchanged) issuer
          this.selectedIssuer$.next(this.currentIssuer());

          // Update balance for the active issuer
          await this.updateBalanceForCurrentCombo();
     }

     private getNiceName(address: string, currency: string): string {
          const wallet = this.walletManagerService.getWallets()?.find(w => w.address === address);
          if (wallet?.name) return wallet.name;

          const custom = this.storage.get('customDestinations');
          if (custom) {
               const list = JSON.parse(custom);
               const found = list.find((d: any) => d.address === address);
               if (found?.name) return found.name;
          }

          const short = address.slice(0, 6) + '...' + address.slice(-4);
          return `${currency} – ${short}`;
     }

     private async updateBalanceForCurrentCombo() {
          if (!this.currentWalletAddress() || !this.currentCurrency() || !this.currentIssuer()) {
               this.balance$.next('0');
               return;
          }

          const cacheKey = `${this.currentWalletAddress()}_${this.currentCurrency()}`;
          const cached = this.balanceCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 8000) {
               const balance = this.extractBalance(cached.data, this.currentCurrency(), this.currentIssuer());
               this.balance$.next(balance);
               return;
          }

          try {
               const client = await this.xrplService.getClient();
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

     /**
      * Returns the array of issuer addresses for a given currency code.
      * Safe to call – always returns an array (empty if currency not found).
      */
     getIssuersForCurrency(currency: string): string[] {
          if (!currency || currency === 'XRP') return [];

          // knownTrustLinesIssuers is: Record<string, string[]>
          return this.knownTrustLinesIssuers[currency] || [];
     }
}
