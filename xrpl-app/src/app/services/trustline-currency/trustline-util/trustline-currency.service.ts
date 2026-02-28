import { computed, effect, inject, Injectable, Signal, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet, WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { SelectItem } from '../../destination-dropdown/destination-dropdown.service';
import { StorageService } from '../../local-storage/storage.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { RippleState } from '../../../models/interface-items.model';
import { AppConstants } from '../../../core/app.constants';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';

interface IssuerItem {
     name: string;
     address: string;
}

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService {
     public readonly txUiService = inject(TransactionUiService);
     private readonly xrplCache = inject(XrplCacheService);

     private readonly knownTrustLinesIssuers = signal<Record<string, string[]>>({ XRP: [] });
     public readonly knownTrustLinesIssuers$ = this.knownTrustLinesIssuers.asReadonly();
     public readonly preferXrpAsDefault = signal<boolean>(true); // default = true (most pages)
     public readonly currentWalletAddress = signal<string>('');
     public readonly currentCurrency = signal<string>('XRP');
     private readonly currentIssuer = signal<string>('');
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();
     public addMptInCurrencyDropdown = signal<boolean>(false);
     public addXrpInCurrencyDropdown = signal<boolean>(false);

     // Keep track of current wallet from streams
     private readonly latestWallets: Wallet[] = [];
     private readonly latestSelectedIndex = 0;

     public readonly currencies = signal<string[]>([]);
     public readonly issuers = signal<IssuerItem[]>([]);
     public readonly selectedIssuer = signal<string>('');
     public readonly balance = signal<string>('0');

     flags = {
          tfSetfAuth: false,
          tfSetNoRipple: false,
          tfClearNoRipple: false,
          tfSetFreeze: false,
          tfClearFreeze: false,
          tfSetDeepFreeze: false,
          tfClearDeepFreeze: false,
     };
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     private readonly flagValues = {
          tfSetfAuth: 0x00010000,
          tfSetNoRipple: 0x00020000,
          tfClearNoRipple: 0x00040000,
          tfSetFreeze: 0x00100000,
          tfClearFreeze: 0x00200000,
          tfSetDeepFreeze: 0x00400000,
          tfClearDeepFreeze: 0x00800000,
     };

     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

     constructor(
          private readonly storage: StorageService,
          private readonly xrplService: XrplService,
          private readonly utils: UtilsService,
          private readonly walletManagerService: WalletManagerService,
          private readonly utilsService: UtilsService
     ) {
          this.loadFromStorage();
     }

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
          if (this.walletManagerService.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManagerService.selectedIndex();
     });

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly trustlineSetButtonLabel = this.buildTxLabel('Set Trustline');
     readonly trustlineRemoveButtonLabel = this.buildTxLabel('Remove Trustline');
     readonly issueCurrencyButtonLabel = this.buildTxLabel('Issue Currency');
     readonly clawbackButtonLabel = this.buildTxLabel('Clawback Tokens');
     readonly addCurrencyIssuerButtonLabel = this.buildTxLabel('Add Currency/Issuer');
     readonly removeSelectedIssuerButtonLabel = this.buildTxLabel('Remove Selected Issuer');

     findWalletAsIssuer(walletAddress: string): { currency: string; issuer: string } | null {
          const normalizedAddr = walletAddress.trim().toLowerCase();

          const known = this.knownTrustLinesIssuers();

          for (const [currency, issuers] of Object.entries(known)) {
               if (currency === 'XRP') continue; // skip native

               for (const issuer of issuers) {
                    if (issuer.toLowerCase() === normalizedAddr) {
                         return { currency, issuer };
                    }
               }
          }

          return null;
     }

     toggleFlag(key: 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          if (this.flags.tfSetfAuth) sum |= this.flagValues.tfSetfAuth;
          if (this.flags.tfSetNoRipple) sum |= this.flagValues.tfSetNoRipple;
          if (this.flags.tfClearNoRipple) sum |= this.flagValues.tfClearNoRipple;
          if (this.flags.tfSetFreeze) sum |= this.flagValues.tfSetFreeze;
          if (this.flags.tfClearFreeze) sum |= this.flagValues.tfClearFreeze;
          if (this.flags.tfSetDeepFreeze) sum |= this.flagValues.tfSetDeepFreeze;
          if (this.flags.tfClearDeepFreeze) sum |= this.flagValues.tfClearDeepFreeze;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue(activeTab: string) {
          if (activeTab !== 'removeTrustline') {
               this.flags = {
                    tfSetfAuth: false,
                    tfSetNoRipple: false,
                    tfClearNoRipple: false,
                    tfSetFreeze: false,
                    tfClearFreeze: false,
                    tfSetDeepFreeze: false,
                    tfClearDeepFreeze: false,
               };
               this.totalFlagsValue.set(0);
               this.totalFlagsHex.set('0x0');
          }
     }

     getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj): obj is xrpl.LedgerEntry.RippleState => obj.LedgerEntryType === 'RippleState')
               .filter(obj => {
                    const bal = Number(obj.Balance?.value ?? 0);
                    const myLimitVal = obj.LowLimit?.issuer === classicAddress ? obj.LowLimit?.value : obj.HighLimit?.value;
                    const peerLimitVal = obj.LowLimit?.issuer === classicAddress ? obj.HighLimit?.value : obj.LowLimit?.value;

                    // Keep only meaningful trustlines (your existing filter logic)
                    return !(bal === 0 && myLimitVal === '0' && peerLimitVal === '0');
               })
               .map(obj => {
                    const isHighSide = obj.HighLimit.issuer === classicAddress;

                    const myLimitObj = isHighSide ? obj.HighLimit : obj.LowLimit;
                    const peerLimitObj = isHighSide ? obj.LowLimit : obj.HighLimit;

                    const myLimitValue = myLimitObj.value;
                    const peerLimitValue = peerLimitObj.value;

                    // The issuer is the one whose limit is typically non-zero while the holder's is set
                    // But more reliably: the issuer sees negative balance when tokens are issued
                    const rawBalance = Number(obj.Balance.value ?? '0');

                    // Balance is always expressed from the perspective of the LowLimit holder
                    // If we're the high side, we need to invert the sign
                    const signedBalance = isHighSide ? -rawBalance : rawBalance;

                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency ?? '');

                    // Extract flags as array of strings
                    const flags: string[] = [];
                    const ledgerFlags = obj.Flags ?? 0;
                    if (ledgerFlags & 0x00010000) flags.push('Authorized'); // lsfLowAuth / lsfHighAuth simplified
                    if (ledgerFlags & 0x00020000) flags.push('NoRipple');
                    if (ledgerFlags & 0x00100000) flags.push('Freeze'); // lsfLowFreeze or lsfHighFreeze
                    // add more if you use them: DeepFreeze 0x00400000 etc.

                    return {
                         currency,
                         issuer: peerLimitObj.issuer, // the other party = issuer if we're holder
                         balance: signedBalance.toString(), // now correctly signed from OUR perspective
                         limit: myLimitValue,
                         flags,
                         isIssuer: signedBalance < 0 && Number(myLimitValue) > 0, // strong indicator
                         rawLedgerBalance: rawBalance, // for debugging
                         isHighSide, // for debugging
                    };
               })
               .sort((a, b) => a.issuer.localeCompare(b.issuer));

          return mapped;
     }

     getExistingIOUs2(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any): obj is xrpl.LedgerEntry.RippleState => {
                    if (obj.LedgerEntryType !== 'RippleState') return false;

                    const balanceValue = obj.Balance?.value ?? '0';
                    const myLimit = obj.LowLimit?.issuer === classicAddress ? obj.LowLimit?.value : obj.HighLimit?.value;

                    const peerLimit = obj.LowLimit?.issuer === classicAddress ? obj.HighLimit?.value : obj.LowLimit?.value;

                    // Hide if:
                    // 1. Balance is exactly zero
                    // 2. AND both sides have zero limit (i.e. user "removed" it)
                    const balanceIsZero = Number.parseFloat(balanceValue) === 0;
                    const myLimitIsZero = myLimit === '0' || myLimit === 0;
                    const peerLimitIsZero = peerLimit === '0' || peerLimit === 0;

                    return !(balanceIsZero && myLimitIsZero && peerLimitIsZero);
               })
               .map((obj: xrpl.LedgerEntry.RippleState): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    const isHighSide = obj.HighLimit.issuer === classicAddress;
                    const issuer = isHighSide ? obj.LowLimit.issuer : obj.HighLimit.issuer;

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

          // this.existingIOUs.set(mapped);
          this.utilsService.logObjects('existingIOUs', mapped);
          return mapped;
     }

     getExistingIOUs1(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
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

          return trustlines.result.lines.some((line: { account: string; currency: string; limit: string }) => {
               const currencyMatches = this.utilsService.decodeIfNeeded(line.currency) === normalizedCurrency;

               const issuerMatches = line.account === issuer;

               const limitIsPositive = Number.parseFloat(line.limit) > 0;

               return issuerMatches && currencyMatches && limitIsPositive;
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
          this.selectedIssuer.set('');
          this.balance.set('0');
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

     readonly currencyBalance = computed<string>(() => this.balance());

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

          return iss.map(i => ({
               id: i.address,
               display: i.name || i.address.slice(0, 8) + '...',
               secondary: i.address,
               isCurrentAccount: i.address === active,
               isCurrentToken: false,
          }));
     });

     public resetToDefault(): void {
          this.selectCurrency('XRP', '');
     }

     getCurrencyItems(): Signal<SelectItem[]> {
          return computed(() => {
               let visibleCurrencies = this.currencies();

               // If flag is false, exclude MPT from display
               if (!this.addMptInCurrencyDropdown()) {
                    visibleCurrencies = visibleCurrencies.filter(c => c !== 'MPT');
               }

               if (!this.addXrpInCurrencyDropdown()) {
                    visibleCurrencies = visibleCurrencies.filter(c => c !== 'XRP');
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

                    if (curr === 'XRP' && this.addXrpInCurrencyDropdown()) {
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

     updateCurrencies() {
          const known = this.knownTrustLinesIssuers();

          // Standard IOU currencies (excluding XRP and MPT)
          const nonXrpIoUs = Object.keys(known)
               .filter(c => c !== 'XRP' && c.trim() !== '' && c !== 'MPT')
               .sort((a, b) => a.localeCompare(b));

          // Build final list - conditionally include XRP
          const allCurrencies: string[] = [];

          if (this.addXrpInCurrencyDropdown()) {
               allCurrencies.push('XRP');
          }

          // Add MPT conditionally
          if (this.addMptInCurrencyDropdown()) {
               allCurrencies.push('MPT');
          }

          // Add user-added IOUs
          allCurrencies.push(...nonXrpIoUs);

          this.currencies.set(allCurrencies);
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

     async selectCurrency(currency: string, _nothing: string) {
          console.log('selectCurrency .................................');
          const normalized = (currency || 'XRP').trim().toUpperCase();

          if (normalized === 'XRP') {
               this.currentCurrency.set('XRP');
               this.currentIssuer.set('');
               this.issuers.set([]);
               this.selectedIssuer.set('');
               this.balance.set('0');
               this.currencies.set(this.currencies()); // trigger any UI refresh if needed
               return;
          }

          this.currentCurrency.set(currency);
          this.loadIssuersForCurrency(currency); // your existing method
          this.updateBalanceForCurrentCombo(); // your existing method
     }

     // Called when user picks an issuer
     selectIssuer(issuer: string) {
          this.currentIssuer.set(issuer);
          this.selectedIssuer.set(issuer);
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

          this.issuers.set(issuers);

          if (issuers.length === 0) {
               this.currentIssuer.set('');
               this.selectedIssuer.set('');
               this.balance.set('0');
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
          this.selectedIssuer.set(this.currentIssuer());

          // Update balance for the active issuer
          // await this.updateBalanceForCurrentCombo();
     }

     private getNiceName(address: string, currency: string): string {
          const wallet = this.walletManagerService.wallets()?.find(w => w.address === address);
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
          console.log('updateBalanceForCurrentCombo ................................. updateBalanceForCurrentCombo');
          const walletAddress = this.currentWalletAddress();
          const currency = this.getSelectedCurrency();
          const issuer = this.getSelectedIssuer();

          if (!walletAddress || !currency || !issuer) {
               this.balance.set('0');
               return;
          }

          const cacheKey = `${walletAddress}_${currency}`;
          const cached = this.balanceCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 8000) {
               const balance = this.extractBalance(cached.data, currency, issuer);
               this.balance.set(balance);
               return;
          }

          try {
               const client = await this.getClient();
               const gatewayBalances = await this.xrplService.getTokenBalance(client, walletAddress, 'validated', '');

               this.balanceCache.set(cacheKey, { data: gatewayBalances, timestamp: Date.now() });

               const balance = this.extractBalance(gatewayBalances, currency, issuer);
               this.balance.set(balance);
          } catch (e) {
               console.warn('Failed to load balance for currency+issuer', e);
               this.balance.set('0');
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
               const asset = result.assets[issuer].find((a: any) => a.currency === normalized);
               if (asset) return this.utils.formatTokenBalance(asset.value, 18);
          }

          // Check balances (owed to you)
          if (result.balances?.[issuer]) {
               const bal = result.balances[issuer].find((b: any) => b.currency === normalized);
               if (bal) return this.utils.formatTokenBalance(bal.value, 18);
          }

          return '0';
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     getCurrencies(): string[] {
          return this.currencies();
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

     public setXrpInDropdown(show: boolean): void {
          this.addXrpInCurrencyDropdown.set(show);
          this.updateCurrencies();
     }
}
