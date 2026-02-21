import { computed, Injectable, Signal, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';

import * as xrpl from 'xrpl';
import { Wallet, WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { SelectItem } from '../../destination-dropdown/destination-dropdown.service';
import { StorageService } from '../../local-storage/storage.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { RippleState } from '../../../models/interface-items.model';

interface IssuerItem {
     name: string;
     address: string;
}

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService {
     private readonly knownTrustLinesIssuers = signal<Record<string, string[]>>({ XRP: [] });
     public readonly knownTrustLinesIssuers$ = this.knownTrustLinesIssuers.asReadonly();
     public readonly preferXrpAsDefault = signal<boolean>(true); // default = true (most pages)
     private readonly destroy$ = new Subject<void>();
     private readonly currentWalletAddress = signal<string>('');
     public readonly currentCurrency = signal<string>('XRP');
     private readonly currentIssuer = signal<string>('');
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();
     public addMptInCurrencyDropdown = signal<boolean>(false);

     // Keep track of current wallet from streams
     private latestWallets: Wallet[] = [];
     private latestSelectedIndex = 0;

     currencies$ = new BehaviorSubject<string[]>([]);
     issuers$ = new BehaviorSubject<IssuerItem[]>([]);
     selectedIssuer$ = new BehaviorSubject<string>('');
     balance$ = new BehaviorSubject<string>('0');

     public readonly currencies = signal<string[]>([]);
     public readonly issuers = signal<IssuerItem[]>([]);
     public readonly selectedIssuer = signal<string>('');
     public readonly balance = signal<string>('0');

     constructor(
          private readonly storage: StorageService,
          private readonly xrplService: XrplService,
          private readonly utils: UtilsService,
          private readonly walletManagerService: WalletManagerService,
          private readonly utilsService: UtilsService
     ) {
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
                         if (this.currentCurrency()) {
                              this.loadIssuersForCurrency(this.currentCurrency());
                              this.updateBalanceForCurrentCombo();
                         }
                    }

                    // Auto-initialize default currency when wallet is ready
                    if (this.currentWalletAddress()) {
                         this.initializeDefaultCurrency();
                    }
               });

          this.currencies$.subscribe(c => this.currencies.set(c));
          this.issuers$.subscribe(i => this.issuers.set(i));
          this.selectedIssuer$.subscribe(i => this.selectedIssuer.set(i));
          this.balance$.subscribe(b => this.balance.set(b));
     }

     getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'RippleState')
               .map((obj: any): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    // Determine if this account is the issuer or holder
                    const issuer = obj.HighLimit?.issuer === classicAddress ? obj.LowLimit?.issuer : obj.HighLimit?.issuer;

                    return {
                         LedgerEntryType: 'RippleState',
                         Balance: {
                              currency,
                              value: balance,
                         },
                         HighLimit: {
                              issuer,
                         },
                    };
               })
               // Sort alphabetically by issuer or currency if available
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

          this.utilsService.logObjects('existingIOUs', mapped);
          return mapped;
     }

     async hasTrustline(trustlines: xrpl.AccountLinesResponse, currency: string, issuer: string): Promise<boolean> {
          const normalizedCurrency = this.utilsService.decodeIfNeeded(currency);

          return trustlines.result.lines.some((line: { account: string; currency: string }) => {
               return line.account === issuer && this.utilsService.decodeIfNeeded(line.currency) === normalizedCurrency;
          });
     }

     hasTrustline1(accountObjects: any[], account: string, currency: string, issuer: string): boolean {
          return accountObjects.some(obj => {
               if (obj.LedgerEntryType !== 'RippleState') return false;

               const isHigh = obj.HighLimit?.issuer === account;
               const limit = isHigh ? obj.HighLimit : obj.LowLimit;

               return limit?.currency === currency && (isHigh ? obj.LowLimit?.issuer : obj.HighLimit?.issuer) === issuer && Number(limit?.value) > 0;
          });
     }

     setPreferXrpAsDefault(prefer: boolean) {
          this.preferXrpAsDefault.set(prefer);
          // Optionally re-apply default immediately
          this.initializeDefaultCurrency();
     }

     private clearCurrentSelection() {
          this.currentCurrency.set('');
          this.currentIssuer.set('');
          this.selectedIssuer$.next('');
          this.balance$.next('0');
     }

     private initializeDefaultCurrency() {
          // Only auto-select if preferXrpAsDefault is true
          if (this.preferXrpAsDefault()) {
               if (this.currentCurrency() === 'XRP' || !this.currentCurrency()) {
                    return;
               }

               this.selectCurrency('XRP', '');
               return;
          }

          // Otherwise fall back to first available non-XRP (or nothing)
          const currencies = this.currencies();
          if (currencies.length > 0) {
               const firstNonXrp = currencies.find(c => c !== 'XRP') || currencies[0];
               this.selectCurrency(firstNonXrp, '');
          }
     }

     getIssuerItems(): Signal<SelectItem[]> {
          return computed(() => {
               return this.issuers().map(iss => ({
                    id: iss.address,
                    display: iss.name || `Issuer ${iss.address.slice(0, 8)}...`,
                    secondary: iss.address,
                    isCurrentAccount: false,
                    isCurrentCode: false,
                    isCurrentToken: iss.address === this.selectedIssuer(),
               }));
          });
     }

     public async refreshCurrentBalance(): Promise<void> {
          await this.updateBalanceForCurrentCombo();
     }

     refreshNonNativeCurrency(): void {
          const currency = this.currentCurrency() ?? 'XRP';
          if (currency === 'XRP' || currency === 'MPT') return;
          this.selectCurrency(currency, '');
     }

     // Public API — use these in components
     readonly currencyItems = computed<SelectItem[]>(() => {
          const currs = this.currencies();
          const active = this.currentCurrency();

          return currs.map(c => ({
               id: c,
               display: c === 'XRP' ? 'XRP' : c,
               secondary: c === 'XRP' ? 'Native currency' : `${this.getIssuersForCurrency(c).length || 0} issuer(s)`,
               isCurrentCode: c === active,
               // ... other props
          }));
     });

     readonly issuerItems = computed<SelectItem[]>(() => {
          const iss = this.issuers();
          const active = this.selectedIssuer();
          //  const currentCode = this.currentCurrency();

          return iss.map(i => ({
               id: i.address,
               display: i.name || i.address.slice(0, 8) + '...',
               secondary: i.address,
               isCurrentAccount: i.address === active,
               // isCurrentCode: curr === currentCode,
               isCurrentToken: false,
          }));
     });

     readonly currencyBalance = computed<string>(() => this.balance());

     // Call this when wallet changes or tab needs reset
     public resetToDefault(): void {
          this.selectCurrency('XRP', '');
          // this.updateBalanceForCurrentCombo();
     }

     getCurrencyItems(): Signal<SelectItem[]> {
          return computed(() => {
               let visibleCurrencies = this.currencies();

               // If flag is false, exclude MPT from display
               if (!this.addMptInCurrencyDropdown()) {
                    visibleCurrencies = visibleCurrencies.filter(c => c !== 'MPT');
               }

               const currentCode = this.currentCurrency();

               return visibleCurrencies.map(curr => {
                    let displayName: string;
                    let secondaryText: string;

                    if (curr === 'XRP') {
                         displayName = 'XRP';
                         secondaryText = 'Native currency';
                    } else if (curr === 'MPT') {
                         displayName = 'MPT';
                         secondaryText = 'Multi-Purpose Token';
                    } else {
                         displayName = curr;
                         const count = this.getIssuersForCurrency(curr).length;
                         secondaryText = count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                    }

                    return {
                         id: curr,
                         display: displayName,
                         secondary: secondaryText,
                         isCurrentAccount: false,
                         isCurrentCode: curr === currentCode,
                         isCurrentToken: false,
                    };
               });
          });
     }

     getCurrencyItems12(): Signal<SelectItem[]> {
          return computed(() => {
               const currentCode = this.currentCurrency();

               return this.currencies().map(curr => {
                    let displayName: string;
                    let secondaryText: string;

                    if (curr === 'XRP') {
                         displayName = 'XRP';
                         secondaryText = 'Native currency';
                    } else if (curr === 'MPT' && this.addMptInCurrencyDropdown()) {
                         displayName = 'MPT';
                         secondaryText = 'Multi-Purpose Token';
                    } else {
                         displayName = curr;
                         const count = this.getIssuersForCurrency(curr).length;
                         secondaryText = count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                    }

                    return {
                         id: curr,
                         display: displayName,
                         secondary: secondaryText,
                         isCurrentAccount: false,
                         isCurrentCode: curr === currentCode,
                         isCurrentToken: false,
                    };
               });
          });
     }

     getCurrencyItems1(): Signal<SelectItem[]> {
          return computed(() => {
               const currentCode = this.currentCurrency();

               return this.currencies().map(curr => ({
                    id: curr,
                    display: curr === 'XRP' ? 'XRP' : curr,
                    secondary:
                         curr === 'XRP'
                              ? 'Native currency'
                              : (() => {
                                     const count = this.getIssuersForCurrency(curr).length;
                                     return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                                })(),
                    isCurrentAccount: false,
                    isCurrentCode: curr === currentCode,
                    isCurrentToken: false,
               }));
          });
     }

     private loadFromStorage() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               const normalized: Record<string, string[]> = {};
               for (const [currency, issuers] of Object.entries(data as any)) {
                    if (Array.isArray(issuers)) {
                         normalized[currency] = issuers;
                    } else if (issuers && typeof issuers === 'object') {
                         normalized[currency] = Object.values(issuers);
                    } else {
                         normalized[currency] = [];
                    }
               }
               normalized['XRP'] = [];
               this.knownTrustLinesIssuers.set(normalized);
          } else {
               this.knownTrustLinesIssuers.set({ XRP: [] });
          }
          this.updateCurrencies();
     }

     private saveToStorage() {
          this.storage.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers());
     }

     public addToken(currency: string, issuer: string): void {
          if (!currency?.trim() || !issuer?.trim()) return;

          const curr = currency.trim();
          const iss = issuer.trim();

          this.knownTrustLinesIssuers.update(map => {
               if (!map[curr]) {
                    map[curr] = [];
               }
               if (!map[curr].includes(iss)) {
                    map[curr].push(iss);
               }
               return { ...map };
          });

          this.saveToStorage();
          this.updateCurrencies();
     }

     public removeToken(currency: string, issuer?: string): void {
          if (!currency) return;

          this.knownTrustLinesIssuers.update(map => {
               if (!map[currency]) return map;

               if (issuer) {
                    map[currency] = map[currency].filter(i => i !== issuer);
                    if (map[currency].length === 0) {
                         delete map[currency];
                    }
               } else {
                    delete map[currency];
               }
               return { ...map };
          });

          this.saveToStorage();
          this.updateCurrencies();
     }

     private updateCurrencies() {
          const known = this.knownTrustLinesIssuers();

          // Standard IOU currencies (excluding XRP and MPT)
          const nonXrpIoUs = Object.keys(known)
               .filter(c => c !== 'XRP' && c.trim() !== '' && c !== 'MPT')
               .sort((a, b) => a.localeCompare(b));

          // Build final list - conditionally include XRP
          const allCurrencies: string[] = ['XRP'];

          // Add MPT conditionally
          if (this.addMptInCurrencyDropdown()) {
               allCurrencies.push('MPT');
          }

          // Add user-added IOUs
          allCurrencies.push(...nonXrpIoUs);

          this.currencies$.next(allCurrencies);
          this.currencies.set(allCurrencies);

          // Auto-select logic
          if (this.preferXrpAsDefault()) {
               // Only select XRP if it exists in the array
               if (allCurrencies.includes('XRP')) {
                    this.selectCurrency('XRP', '');
               } else if (allCurrencies.length > 0) {
                    // Fallback to first available currency if XRP not present
                    const fallback = allCurrencies.find(c => c === 'MPT') || allCurrencies[0];
                    this.selectCurrency(fallback, '');
               }
          } else if (allCurrencies.length > 1) {
               // Fallback to MPT if present, then first IOU
               const fallback = allCurrencies.find(c => c === 'MPT') || allCurrencies[1] || allCurrencies[0];
               this.selectCurrency(fallback, '');
          }
     }

     getAvailableCurrencies(includeXrp: boolean = false): string[] {
          let currencies = Object.keys(this.knownTrustLinesIssuers);

          if (!includeXrp) {
               currencies = currencies.filter(c => c !== 'XRP');
          }

          return currencies.sort((a, b) => a.localeCompare(b));
     }

     async selectCurrency(currency: string, nothing: string) {
          if (!currency || currency === 'XRP') {
               this.currentCurrency.set('XRP');
               this.currentIssuer.set('');
               this.issuers$.next([]);
               this.selectedIssuer$.next('');
               this.balance$.next('0');
               this.currencies$.next(this.currencies()); // trigger any UI refresh if needed
               return;
          }

          this.currentCurrency.set(currency);
          this.loadIssuersForCurrency(currency); // your existing method
          this.updateBalanceForCurrentCombo(); // your existing method

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
          const known = this.knownTrustLinesIssuers()[currency] || [];
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

     getCurrencies(): string[] {
          return this.currencies$.value;
     }

     getSelectedCurrency(): string {
          return this.currentCurrency();
     }

     getSelectedIssuer(): string {
          return this.currentIssuer();
     }

     getIssuersForCurrency(currency: string): string[] {
          if (!currency || currency === 'XRP') return [];
          return this.knownTrustLinesIssuers()[currency] || [];
     }

     public setAddMptInDropdown(show: boolean): void {
          this.addMptInCurrencyDropdown.set(show);
          this.updateCurrencies();
     }
}
