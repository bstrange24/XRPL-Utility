// src/app/services/offer-currency/offer-currency.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { StorageService } from '../local-storage/storage.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export interface IssuerItem {
     name: string;
     address: string;
}

export interface CurrencySideState {
     currency$: BehaviorSubject<string>;
     issuer$: BehaviorSubject<string>;
     issuers$: BehaviorSubject<IssuerItem[]>;
     balance$: BehaviorSubject<string>;
}

@Injectable({
     providedIn: 'root',
})
export class OfferCurrencyService {
     private knownTrustLinesIssuers: Record<string, string[]> = { XRP: [] };
     public readonly weWant: CurrencySideState;
     public readonly weSpend: CurrencySideState;
     private walletAddress = '';
     // Cache per wallet+currency (shared across both sides)
     private balanceCache = new Map<string, { data: any; timestamp: number }>();

     constructor(private storage: StorageService, private xrplService: XrplService, private utils: UtilsService, private walletManagerService: WalletManagerService) {
          this.weWant = this.createSideState();
          this.weSpend = this.createSideState();
          this.loadKnownIssuersFromStorage();
     }

     private createSideState(): CurrencySideState {
          return {
               currency$: new BehaviorSubject<string>(''),
               issuer$: new BehaviorSubject<string>(''),
               issuers$: new BehaviorSubject<IssuerItem[]>([]),
               balance$: new BehaviorSubject<string>('0'),
          };
     }

     private loadKnownIssuersFromStorage() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers = data;
          }
     }

     // Call this once when wallet is selected
     setWalletAddress(address: string) {
          this.walletAddress = address;
          this.balanceCache.clear(); // optional: clear cache on wallet change
     }

     getAvailableCurrencies(includeXrp: boolean = false): string[] {
          let currencies = Object.keys(this.knownTrustLinesIssuers);
          if (!includeXrp) {
               currencies = currencies.filter(c => c !== 'XRP');
          }
          return currencies.sort((a, b) => a.localeCompare(b));
     }

     // === WE WANT SIDE ===
     selectWeWantCurrency(currency: string, currentWallet: any) {
          this.weWant.currency$.next(currency);
          this.loadIssuersForSide(currency, this.weWant);
          this.updateBalanceForSide(this.weWant, currentWallet);
     }

     selectWeWantIssuer(issuer: string, currentWallet: any) {
          this.weWant.issuer$.next(issuer);
          this.updateBalanceForSide(this.weWant, currentWallet);
     }

     selectWeSpendCurrency(currency: string, currentWallet: any) {
          this.weSpend.currency$.next(currency);
          this.loadIssuersForSide(currency, this.weSpend);
          this.updateBalanceForSide(this.weSpend, currentWallet);
     }

     selectWeSpendIssuer(issuer: string, currentWallet: any) {
          this.weSpend.issuer$.next(issuer);
          this.updateBalanceForSide(this.weSpend, currentWallet);
     }

     private async loadIssuersForSide(currency: string, side: CurrencySideState) {
          if (!currency || currency === 'XRP') {
               side.issuers$.next([]);
               side.issuer$.next('');
               return;
          }

          const known = this.knownTrustLinesIssuers[currency] || [];
          // console.log(`known: ${known}`);
          const issuers: IssuerItem[] = known
               .map(addr => ({
                    name: this.getNiceName(addr, currency),
                    address: addr,
               }))
               .sort((a, b) => a.name.localeCompare(b.name));

          // console.log(`issuers: ${JSON.stringify(issuers, null, '\t')}`);
          side.issuers$.next(issuers);

          // Auto-select first issuer if none selected
          if (issuers.length > 0 && !side.issuer$.value) {
               side.issuer$.next(issuers[0].address);
          }
     }

     private getNiceName(address: string, currency: string): string {
          const wallet = this.walletManagerService.getWallets()?.find(w => w.address === address);
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
          const currency = side.currency$.value;
          const issuer = side.issuer$.value;

          if (!this.walletAddress || !currency || currency === 'XRP' || !issuer) {
               side.balance$.next(currency === 'XRP' ? currentWallet.balance : '0');
               return;
          }

          const cacheKey = `${this.walletAddress}_${currency}`;
          const cached = this.balanceCache.get(cacheKey);

          if (cached && Date.now() - cached.timestamp < 8000) {
               const balance = this.extractBalance(cached.data, currency, issuer);
               side.balance$.next(balance);
               return;
          }

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utils.getWalletFromAddress(this.walletAddress);
               const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

               this.balanceCache.set(cacheKey, { data: gatewayBalances, timestamp: Date.now() });

               const balance = this.extractBalance(gatewayBalances, currency, issuer);
               // console.log(`updateBalanceForSide side: ${side} balance: ${balance}`);
               side.balance$.next(balance);
          } catch (e) {
               console.warn('Failed to load balance', e);
               side.balance$.next('0');
          }
     }

     private extractBalance(gatewayBalances: any, currency: string, issuer: string): string {
          const result = gatewayBalances.result;
          const normalized = this.utils.normalizeCurrencyCode(currency);

          // Obligations (you issued)
          if (result.obligations?.[normalized]) {
               return `-${this.utils.formatTokenBalance(result.obligations[normalized], 18)}`;
          }

          // Assets (others issued to you)
          if (result.assets?.[issuer]) {
               const asset = result.assets[issuer].find((a: any) => this.utils.normalizeCurrencyCode(a.currency) === normalized);
               if (asset) return this.utils.formatTokenBalance(asset.value, 18);
          }

          // Balances (owed to you)
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
          this.weWant.currency$.next('');
          this.weWant.issuer$.next('');
          this.weWant.issuers$.next([]);
          this.weWant.balance$.next('0');

          this.weSpend.currency$.next('');
          this.weSpend.issuer$.next('');
          this.weSpend.issuers$.next([]);
          this.weSpend.balance$.next('0');
     }
}
