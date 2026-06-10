import { effect, inject, Injectable, signal } from '@angular/core';
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
     private readonly walletAddress = signal<string>('');
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();
     private refreshInProgress = false;

     constructor() {
          this.loadKnownIssuersFromStorage();

          // Initialize the side states
          this.weWant = this.createSideState();
          this.weSpend = this.createSideState();

          this.loadKnownIssuersFromStorage();

          // Watch for currency changes without infinite loops
          effect(() => {
               const currency = this.weWant.currency();
               if (currency && currency !== 'XRP') {
                    this.loadIssuersForSide(currency, this.weWant);
               }
          });

          effect(() => {
               const currency = this.weSpend.currency();
               if (currency && currency !== 'XRP') {
                    this.loadIssuersForSide(currency, this.weSpend);
               }
          });
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
          try {
               const data = this.storage.getKnownIssuers('knownIssuers');

               if (data && typeof data === 'object') {
                    this.knownTrustLinesIssuers = { ...data }; // deep copy
               } else {
                    this.knownTrustLinesIssuers = { XRP: [] };
               }
          } catch (e) {
               console.error('Failed to load known issuers from storage', e);
               this.knownTrustLinesIssuers = { XRP: [] };
          }
     }

     setWalletAddress(address: string) {
          this.walletAddress.set(address);
          this.balanceCache.clear();
     }

     getAvailableCurrencies(includeXrp = false): string[] {
          let currencies = Object.keys(this.knownTrustLinesIssuers);
          if (!includeXrp) {
               currencies = currencies.filter(c => c !== 'XRP');
          }
          return currencies.sort((a, b) => a.localeCompare(b));
     }

     async selectWeWantCurrency(currency: string, currentWallet: any): Promise<void> {
          if (!currency) return;

          this.weWant.currency.set(currency);

          if (currency !== 'XRP') {
               await this.loadIssuersForSide(currency, this.weWant);
          } else {
               this.weWant.issuers.set([]);
               this.weWant.issuer.set(''); // XRP has no issuer
          }

          await new Promise(resolve => setTimeout(resolve, 50));
          await this.updateBalanceForSide(this.weWant, currentWallet);
     }

     async selectWeWantIssuer(issuer: string, currentWallet: any): Promise<void> {
          if (!issuer) return;

          this.weWant.issuer.set(issuer);
          await this.updateBalanceForSide(this.weWant, currentWallet);
     }

     async selectWeSpendCurrency(currency: string, currentWallet: any): Promise<void> {
          if (!currency) return;

          this.weSpend.currency.set(currency);

          if (currency !== 'XRP') {
               await this.loadIssuersForSide(currency, this.weSpend);
          } else {
               this.weSpend.issuers.set([]);
               this.weSpend.issuer.set(''); // XRP has no issuer
          }

          await new Promise(resolve => setTimeout(resolve, 50));
          await this.updateBalanceForSide(this.weSpend, currentWallet);
     }

     async selectWeSpendIssuer(issuer: string, currentWallet: any): Promise<void> {
          if (!issuer) return;

          this.weSpend.issuer.set(issuer);
          await this.updateBalanceForSide(this.weSpend, currentWallet);
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

          // CRITICAL: Always set an issuer if available
          if (issuers.length > 0) {
               const selected = issuers[0].address;
               side.issuer.set(selected);
               console.log(`✅ Auto-selected issuer for ${currency}: ${selected}`);
          } else {
               console.warn(`⚠️ No issuers found for currency: ${currency}`);
               side.issuer.set('');
          }
     }

     private getNiceName(address: string, currency: string): string {
          // Check wallet names
          const wallet = this.walletManagerService.wallets()?.find(w => w.address === address);
          if (wallet?.name) return wallet.name;

          // Check custom destinations
          try {
               const custom = this.storage.get('customDestinations');
               if (custom) {
                    const list = JSON.parse(custom);
                    const found = list.find((d: any) => d.address === address);
                    if (found?.name) return found.name;
               }
          } catch (e) {
               console.warn('Error parsing customDestinations', e);
          }

          return `${currency} Issuer (${address.slice(0, 8)}...)`;
     }

     private async updateBalanceForSide(side: CurrencySideState, currentWallet: any): Promise<void> {
          if (this.refreshInProgress) {
               await new Promise(resolve => setTimeout(resolve, 100));
          }

          this.refreshInProgress = true;

          try {
               const currency = side.currency();
               const issuer = side.issuer();
               const walletAddr = this.walletAddress() || currentWallet?.classicAddress || currentWallet?.address;

               if (!walletAddr || !currency) {
                    side.balance.set('0');
                    return;
               }

               if (currency === 'XRP') {
                    let xrpBalance = currentWallet?.balance ?? currentWallet?.xrpBalance ?? this.walletManagerService.getSelectedWallet()?.balance ?? '0';
                    side.balance.set(xrpBalance);
                    return;
               }

               if (!issuer) {
                    side.balance.set('0');
                    return;
               }

               const cacheKey = `${walletAddr}_${currency}_${issuer}`;
               const cached = this.balanceCache.get(cacheKey);

               if (cached && Date.now() - cached.timestamp < 8000) {
                    const balance = this.extractBalance(cached.data, currency, issuer);
                    side.balance.set(balance || '0');
                    return;
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.utils.getWalletFromAddress(walletAddr);

               const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

               this.balanceCache.set(cacheKey, { data: gatewayBalances, timestamp: Date.now() });

               const balance = this.extractBalance(gatewayBalances, currency, issuer);
               side.balance.set(balance || '0');
          } catch (e) {
               console.error('Failed to load balance', side.currency(), side.issuer(), e);
               side.balance.set('0');
          } finally {
               this.refreshInProgress = false;
          }
     }

     refreshXrpBalance(wallet: any) {
          if (wallet?.balance) {
               // Update both sides if they are XRP
               if (this.weWant.currency() === 'XRP') this.weWant.balance.set(wallet.balance);
               if (this.weSpend.currency() === 'XRP') this.weSpend.balance.set(wallet.balance);
          }
     }

     private extractBalance(gatewayBalances: any, currency: string, issuer: string): string {
          const result = gatewayBalances?.result || gatewayBalances;
          if (!result) return '0';

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

     async refreshBothBalances(currentWallet: any): Promise<void> {
          if (!currentWallet) return;

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
