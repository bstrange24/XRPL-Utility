import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TxEnvironmentService, PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineFlagKey } from '../../../components/trustlines/constants/trustline.types';
import { IssuerItem } from '../../../models/interface-items.model';
import { CLEAR_FLAGS, SET_FLAGS, TRUSTLINE } from '../../../components/trustlines/constants/trustline.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

@Injectable({ providedIn: 'root' })
export class TrustlineCurrencyService extends PerformanceBaseComponent {
     private readonly currencyStore = inject(CurrencyStoreService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly storage = inject(StorageService);
     private readonly utils = inject(UtilsService);
     public readonly utilsService = inject(UtilsService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);

     private readonly knownIssuers = signal<Record<string, string[]>>({ XRP: [] });
     private readonly knownTrustLinesIssuers = signal<Record<string, string[]>>({ XRP: [] });
     public readonly knownTrustLinesIssuers$ = this.knownTrustLinesIssuers.asReadonly();
     public readonly preferXrpAsDefault = signal<boolean>(false);
     public readonly addMptInCurrencyDropdown = signal<boolean>(false);
     public readonly addXrpInCurrencyDropdown = signal<boolean>(false);

     flags = signal<Record<TrustlineFlagKey, boolean>>({
          tfSetfAuth: false,
          tfSetNoRipple: false,
          tfClearNoRipple: false,
          tfSetFreeze: false,
          tfClearFreeze: false,
          tfSetDeepFreeze: false,
          tfClearDeepFreeze: false,
     });
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

     public readonly trustlineFlags: Record<string, boolean> = { ...TRUSTLINE.FLAGS };
     public readonly trustlineFlagList = TRUSTLINE.FLAG_LIST;
     public readonly flagMap = TRUSTLINE.FLAG_MAP;
     public readonly ledgerFlagMap = TRUSTLINE.LEDGER_FLAG_MAP;
     public readonly setFlags = SET_FLAGS;
     public readonly clearFlags = CLEAR_FLAGS;

     readonly currencies = computed(() => {
          const map = this.knownIssuers();
          const addXrp = this.addXrpInCurrencyDropdown();
          const addMpt = this.addMptInCurrencyDropdown();

          const nonXrp = Object.keys(map)
               .filter(c => c !== 'XRP' && c.trim() !== '' && c !== 'MPT')
               .sort((a, b) => a.localeCompare(b));

          const result: string[] = [];

          if (addXrp) result.push('XRP');
          if (addMpt) result.push('MPT');

          result.push(...nonXrp);

          return result;
     });

     readonly issuers = computed<IssuerItem[]>(() => {
          const currency = this.currencyStore.currency();
          const map = this.knownIssuers();

          if (!currency || currency === 'XRP') return [];

          return (map[currency] || []).map(addr => ({
               address: addr,
               name: this.getNiceName(addr, currency),
          }));
     });

     readonly currencyItems = computed(() => {
          const active = this.currencyStore.currency();

          return this.currencies().map(c => ({
               id: c,
               display: c,
               secondary: c === 'XRP' ? 'Native currency' : `${this.getIssuersForCurrency(c).length} issuer(s)`,
               isCurrentCode: c === active,
          }));
     });

     readonly issuerItems = computed(() => {
          const active = this.currencyStore.issuer();

          return this.issuers().map(i => ({
               id: i.address,
               display: i.name,
               secondary: i.address,
               isCurrentAccount: i.address === active,
          }));
     });

     selectedIssuerItem = computed(() => {
          const issuer = this.currencyStore.issuer();

          return this.issuerItems().find(i => i.id === issuer);
     });

     selectCurrency(item: any) {
          const currency = item?.id ?? item; // ← fixed
          this.currencyStore.setCurrency(currency);

          const issuers = this.getIssuersForCurrency(currency);
          if (!issuers.length) {
               this.currencyStore.setIssuer('');
               return;
          }
          this.currencyStore.setIssuer(issuers[0]); // already correct for your BOB case
     }

     selectIssuer(item: any) {
          const value = item?.id ?? item; // ← fixed
          this.currencyStore.setIssuer(value);
     }

     addToken(currency: string, issuer: string) {
          if (!currency || !issuer) return;

          this.knownIssuers.update(map => {
               const next = { ...map };
               next[currency] = next[currency] || [];

               if (!next[currency].includes(issuer)) next[currency].push(issuer);

               return next;
          });

          this.save();
     }

     removeToken(currency: string, issuer?: string) {
          this.knownIssuers.update(map => {
               const next = { ...map };

               if (!next[currency]) return next;

               if (issuer) {
                    next[currency] = next[currency].filter(i => i !== issuer);
                    if (!next[currency].length) delete next[currency];
               } else delete next[currency];

               return next;
          });

          this.save();
     }

     private extractBalance(gatewayBalances: any, wallet: string, currency: string, issuer: string): string {
          const result = gatewayBalances?.result;
          if (!result) return '0';

          // Normalize everything for reliable comparison
          const normCurrency = this.utils.normalizeCurrencyCode(currency);
          const walletAddr = this.utils.normalizeAddress(wallet); // add this helper if you don't have it
          const issuerAddr = this.utils.normalizeAddress(issuer);

          // Issuer view (obligation = total issued / negative balance)
          if (walletAddr === issuerAddr) {
               // obligations keys are usually the raw currency code (same as ledger)
               const obligation = result.obligations?.[normCurrency] || result.obligations?.[currency];

               if (!obligation) return '0';

               return '-' + this.utils.formatTokenBalance(obligation, 18);
          }

          // Holder view (positive balance)
          const balances = result.balances?.[issuer] || result.assets?.[issuer] || [];
          const entry = balances.find((b: any) => this.utils.normalizeCurrencyCode(b.currency) === normCurrency);

          return entry ? this.utils.formatTokenBalance(entry.value, 18) : '0';
     }

     setPreferXrpAsDefault(prefer: boolean) {
          this.preferXrpAsDefault.set(prefer);
          // Optionally re-apply default immediately
          this.initializeDefaultCurrency();
     }

     private initializeDefaultCurrency() {
          // Only auto-select if preferXrpAsDefault is true
          if (this.preferXrpAsDefault()) {
               if (this.currencyStore.currency() === 'XRP' || !this.currencyStore.currency()) return;

               this.selectCurrency('XRP');
               return;
          }

          // Otherwise fall back to first available non-XRP (or nothing)
          const currencies = this.currencies();
          if (currencies.length > 0) {
               const firstNonXrp = currencies.find(c => c !== 'XRP') || currencies[0];
               this.selectCurrency(firstNonXrp);
          }
     }

     getIssuersForCurrency(currency: string): string[] {
          return this.knownIssuers()[currency] || [];
     }

     private getNiceName(address: string, currency: string): string {
          const wallet = this.walletManager.wallets()?.find(w => w.address === address);
          if (wallet?.name) return wallet.name;

          const short = address.slice(0, 6) + '...' + address.slice(-4);
          return `${currency} – ${short}`;
     }

     private save() {
          this.storage.setKnownIssuers('knownIssuers', this.knownIssuers());
     }

     load() {
          const data = this.storage.getKnownIssuers('knownIssuers');
          const normalized: Record<string, string[]> = {};

          for (const [currency, issuers] of Object.entries(data || {})) {
               normalized[currency] = Array.isArray(issuers) ? issuers : Object.values(issuers as any);
          }

          normalized['XRP'] = [];
          this.knownIssuers.set(normalized);
     }

     public async refreshCurrentBalance(): Promise<void> {
          await this.updateBalanceForCurrentCombo();
     }

     /**
      * Update the displayed balance using an already-fetched env object (avoids an extra network round-trip).
      * Requires `env.accountInfo` (for XRP) or `env.gatewayBalanceObject` (for tokens) to be present.
      */
     public async refreshCurrentBalanceFromEnv(env: PrepareTxEnvironmentResult): Promise<void> {
          const walletAddress = this.walletManager.getSelectedWallet()?.classicAddress;
          const currency = this.currencyStore.currency();
          const issuer = this.currencyStore.issuer();

          if (!walletAddress || !currency) {
               this.currencyStore.setField('balance', '0');
               return;
          }

          if (currency === 'XRP') {
               try {
                    const bal = Number(env.accountInfo?.result.account_data.Balance ?? 0) / 1_000_000;
                    this.currencyStore.setField('balance', this.utilsService.formatTokenBalance(bal.toString(), 6));
               } catch {
                    this.currencyStore.setField('balance', '0');
               }
               return;
          }

          if (!issuer) {
               this.currencyStore.setField('balance', '0');
               return;
          }

          try {
               const balance = this.extractBalance(env.gatewayBalanceObject, walletAddress, currency, issuer);
               this.currencyStore.setField('balance', balance);
          } catch (err) {
               console.warn('Failed to extract token balance from env:', err);
               this.currencyStore.setField('balance', '0');
          }
     }

     private async updateBalanceForCurrentCombo(): Promise<void> {
          await this.withPerf('updateBalanceForCurrentCombo', async () => {
               console.log('updateBalanceForCurrentCombo ................................. updateBalanceForCurrentCombo');
               const walletAddress = this.walletManager.getSelectedWallet()?.classicAddress;
               const currency = this.currencyStore.currency();
               const issuer = this.currencyStore.issuer();
               const wallet = this.walletManager.getSelectedWallet()?.classicAddress;

               if (!walletAddress || !currency) {
                    this.currencyStore.setField('balance', '0');
                    return;
               }

               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeGatewayBalance: true,
               });

               if (currency === 'XRP') {
                    try {
                         const bal = Number(env.accountInfo?.result.account_data.Balance ?? 0) / 1_000_000;
                         this.currencyStore.setField('balance', this.utilsService.formatTokenBalance(bal.toString(), 6));
                    } catch {
                         this.currencyStore.setField('balance', '0');
                    }
                    return;
               }

               if (!issuer) {
                    this.currencyStore.setField('balance', '0');
                    return;
               }

               try {
                    const balance = this.extractBalance(env.gatewayBalanceObject, wallet!, currency, issuer);
                    this.currencyStore.setField('balance', balance);
               } catch (err) {
                    console.warn('Failed to fetch token balance:', err);
                    this.currencyStore.setField('balance', '0');
               }
          });
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

     refreshNonNativeCurrency(): void {
          const currency = this.currencyStore.currency() ?? 'XRP';
          if (currency === 'XRP' || currency === 'MPT') return;
          this.selectCurrency(currency);
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

     toggleFlag(key: TrustlineFlagKey) {
          this.flags.update(f => {
               f[key] = !f[key];
               return f;
          });
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          if (this.flags().tfSetfAuth) sum |= this.flagValues.tfSetfAuth;
          if (this.flags().tfSetNoRipple) sum |= this.flagValues.tfSetNoRipple;
          if (this.flags().tfClearNoRipple) sum |= this.flagValues.tfClearNoRipple;
          if (this.flags().tfSetFreeze) sum |= this.flagValues.tfSetFreeze;
          if (this.flags().tfClearFreeze) sum |= this.flagValues.tfClearFreeze;
          if (this.flags().tfSetDeepFreeze) sum |= this.flagValues.tfSetDeepFreeze;
          if (this.flags().tfClearDeepFreeze) sum |= this.flagValues.tfClearDeepFreeze;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue(activeTab: string) {
          if (activeTab !== 'removeTrustline') {
               this.flags.set({
                    tfSetfAuth: false,
                    tfSetNoRipple: false,
                    tfClearNoRipple: false,
                    tfSetFreeze: false,
                    tfClearFreeze: false,
                    tfSetDeepFreeze: false,
                    tfClearDeepFreeze: false,
               });
               this.totalFlagsValue.set(0);
               this.totalFlagsHex.set('0x0');
          }
     }

     setFlag(key: TrustlineFlagKey, value: boolean) {
          this.flags.update(f => {
               f[key] = value;
               return f;
          });
          this.updateFlagTotal();
     }
}
