import { computed, effect, inject, Injectable, Signal, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { SelectItem } from '../../destination-dropdown/destination-dropdown.service';
import { StorageService } from '../../local-storage/storage.service';
import { UtilsService } from '../../util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';

interface IssuerItem {
     name: string;
     address: string;
}

type TrustlineFlagKey = 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze';
type TrustlineTab = 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers';

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService {
     public readonly txUiService = inject(TransactionUiService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);

     private readonly knownTrustLinesIssuers = signal<Record<string, string[]>>({ XRP: [] });
     public readonly knownTrustLinesIssuers$ = this.knownTrustLinesIssuers.asReadonly();
     public readonly preferXrpAsDefault = signal<boolean>(true); // default = true (most pages)
     public readonly currentWalletAddress = signal<string>('');
     public readonly currentCurrency = signal<string>('XRP');
     private readonly currentIssuer = signal<string>('');
     private readonly balanceCache = new Map<string, { data: any; timestamp: number }>();
     public addMptInCurrencyDropdown = signal<boolean>(false);
     public addXrpInCurrencyDropdown = signal<boolean>(false);

     public readonly currencies = signal<string[]>([]);
     public readonly issuers = signal<IssuerItem[]>([]);
     public readonly selectedIssuer = signal<string>('');
     public readonly balance = signal<string>('0');
     public readonly isIssuer = signal<boolean>(false);

     flags: Record<TrustlineFlagKey, boolean> = {
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

     getTrustlineState(accountObjects: xrpl.AccountObjectsResponse, walletAddr: string, issuer: string, encodedCurrency: string): xrpl.LedgerEntry.RippleState | undefined {
          return accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encodedCurrency && ((obj.LowLimit?.issuer === walletAddr && obj.HighLimit?.issuer === issuer) || (obj.HighLimit?.issuer === walletAddr && obj.LowLimit?.issuer === issuer)));
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
                         const pluralSuffix = count === 1 ? '' : 's';
                         secondaryText = count === 0 ? 'No issuers' : `${count} issuer${pluralSuffix}`;
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

          // Get sorted IOU currencies (exclude XRP and MPT)
          const nonXrpIoUs = Object.keys(known)
               .filter(c => c !== 'XRP' && c.trim() !== '' && c !== 'MPT')
               .sort((a, b) => a.localeCompare(b)); // alphabetical

          // Build the final ordered list
          const allCurrencies: string[] = [];

          // 1. XRP always first (if enabled)
          if (this.addXrpInCurrencyDropdown()) {
               allCurrencies.push('XRP');
          }

          // 2. MPT second (if enabled)
          if (this.addMptInCurrencyDropdown()) {
               allCurrencies.push('MPT');
          }

          // 3. All other IOUs in alphabetical order
          allCurrencies.push(...nonXrpIoUs);

          this.currencies.set(allCurrencies);

          if (this.preferXrpAsDefault()) {
               if (allCurrencies.includes('XRP')) {
                    this.selectCurrency('XRP', '');
               } else if (allCurrencies.length > 0) {
                    this.selectCurrency(allCurrencies[0], ''); // now always the first real one
               }
          } else if (allCurrencies.length > 0) {
               // Prefer MPT if present, otherwise first IOU
               const fallback = allCurrencies.includes('MPT') ? 'MPT' : allCurrencies.find(c => c !== 'XRP') || allCurrencies[0];
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

     private async updateBalanceForCurrentCombo(): Promise<void> {
          console.log('updateBalanceForCurrentCombo ................................. updateBalanceForCurrentCombo');
          const startTime = performance.now();
          try {
               const walletAddress = this.currentWalletAddress();
               const currency = this.currentCurrency();
               const issuer = this.currentIssuer();

               if (!walletAddress || !currency) {
                    this.balance.set('0');
                    return;
               }

               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeGatewayBalance: true,
               });

               if (currency === 'XRP') {
                    try {
                         const bal = Number(env.accountInfo?.result.account_data.Balance ?? 0) / 1_000_000;
                         this.balance.set(this.utils.formatTokenBalance(bal.toString(), 6));
                    } catch {
                         this.balance.set('0');
                    }
                    return;
               }

               if (!issuer) {
                    this.balance.set('0');
                    return;
               }

               try {
                    const balance = this.extractBalance(env.gatewayBalanceObject, currency, issuer);
                    this.balance.set(balance);
               } catch (err) {
                    console.warn('Failed to fetch token balance:', err);
                    this.balance.set('0');
               }
          } finally {
               const endTime = performance.now();
               const duration = endTime - startTime;
               console.log(`updateBalanceForCurrentCombo took ${duration.toFixed(2)}ms`);
          }
     }

     private extractBalance(gatewayBalances: any, currency: string, issuer: string): string {
          const result = gatewayBalances?.result;
          if (!result) return '0';

          const normCurrency = this.utils.normalizeCurrencyCode(currency);

          // Issuer perspective
          if (this.currentWalletAddress() === issuer) {
               this.isIssuer.set(true);
               return this.extractIssuerBalance(gatewayBalances, currency);
          }

          // Holder perspective
          this.isIssuer.set(false);
          const balances = result.balances?.[issuer] ? result.balances?.[issuer] : result.assets?.[issuer] || [];
          const balEntry = balances.find((b: any) => this.utils.normalizeCurrencyCode(b.currency) === normCurrency);

          if (balEntry) {
               return this.utils.formatTokenBalance(balEntry.value, 18);
          }

          return '0';
     }

     private extractIssuerBalance(gatewayBalances: any, currency: string): string {
          const result = gatewayBalances?.result;
          if (!result?.obligations) return '0';

          const obligationValue = result.obligations[currency];

          if (!obligationValue) return '0';

          return '-' + this.utils.formatTokenBalance(obligationValue, 18);
     }

     getCurrencies(): string[] {
          return this.currencies();
     }

     setSelectedCurrency(currency: string): void {
          return this.currentCurrency.set(currency);
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

     readonly tabs: {
          key: TrustlineTab;
          label: string;
          icon: string;
     }[] = [
          {
               key: 'setTrustline',
               label: 'Set',
               icon: 'heroAdjustmentsVertical',
          },
          {
               key: 'removeTrustline',
               label: 'Remove',
               icon: 'heroTrash',
          },
          {
               key: 'issueCurrency',
               label: 'Send / Issue Currency',
               icon: 'heroCurrencyDollar',
          },
          {
               key: 'clawbackTokens',
               label: 'Clawback',
               icon: 'heroTrash',
          },
          {
               key: 'addNewIssuers',
               label: 'Modify Issuers',
               icon: 'heroPlusCircle',
          },
     ];

     readonly tabMeta = {
          setTrustline: {
               icon: 'heroAdjustmentsVertical',
               colorClass: 'blue-button-submenu',
               title: 'Set Trustline',
               desc: 'Set a trustline to another XRPL address',
          },
          removeTrustline: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Remove Trustline',
               desc: 'Remove trustline to another XRPL address',
          },
          issueCurrency: {
               icon: 'heroCurrencyDollar',
               colorClass: 'green-button-submenu',
               title: 'Send / Issue Currency',
               desc: 'Send / Issue currency to another XRPL address',
          },
          clawbackTokens: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Clawback Tokens',
               desc: 'Clawback tokens from another XRPL address',
          },
          addNewIssuers: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Add/Remove Issuers',
               desc: 'Add issuers and tokens from external sources.',
          },
     };

     readonly setFlags: {
          key: TrustlineFlagKey;
          title: string;
          hex: string;
          desc: string;
          isClearFlag: boolean;
     }[] = [
          {
               key: 'tfSetfAuth',
               title: 'SetfAuth',
               hex: '0x00010000',
               desc: 'Authorize the other party to hold currency issued by this account. (No effect unless using the asfRequireAuth AccountSet flag.) Cannot be unset.',
               isClearFlag: true,
          },
          {
               key: 'tfSetNoRipple',
               title: 'SetNoRipple',
               hex: '0x00020000',
               desc: 'Enable the No Ripple flag, which blocks rippling between two trust lines of the same currency if this flag is enabled on both.',
               isClearFlag: true,
          },
          {
               key: 'tfSetFreeze',
               title: 'SetFreeze',
               hex: '0x00100000',
               desc: 'Freeze the trustline (prevent transfers).',
               isClearFlag: true,
          },
          {
               key: 'tfSetDeepFreeze',
               title: 'SetDeepFreeze',
               hex: '0x00400000',
               desc: 'Deep-Freeze (block sending & receiving). Requires freeze first.',
               isClearFlag: true,
          },
     ];

     readonly clearFlags: {
          key: TrustlineFlagKey;
          title: string;
          hex: string;
          desc: string;
          isClearFlag: boolean;
     }[] = [
          {
               key: 'tfClearNoRipple',
               title: 'ClearNoRipple',
               hex: '0x00040000',
               desc: 'Required to remove trustline...',
               isClearFlag: true,
          },
          {
               key: 'tfClearFreeze',
               title: 'ClearFreeze',
               hex: '0x00200000',
               desc: 'Required to remove a frozen trustline.',
               isClearFlag: true,
          },
          {
               key: 'tfClearDeepFreeze',
               title: 'ClearDeepFreeze',
               hex: '0x00200000',
               desc: 'Required to remove a deep-frozen trustline.',
               isClearFlag: true,
          },
     ];
}
