import { inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import * as xrpl from 'xrpl';
import { TrustlineActionTypes, TrustlineFlagKey } from '../../../components/trustlines/constants/trustline.types';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TRUSTLINE } from '../../../components/trustlines/constants/trustline.constants';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class TrustlineUtilService {
     private readonly walletManager = inject(WalletManagerService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly acccountDataService = inject(AcccountDataService);

     readonly activeTab = signal<TrustlineActionTypes>('setTrustline');

     async loadTrustlines(forceRefresh = false): Promise<void> {
          const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;
          if (!currentWallet) {
               this.trustlineStoreService.setField('existingIOUs', []);
               return;
          }

          console.log(`Loading trustlines for wallet: ${currentWallet.slice(0, 8)}...`);
          this.trustlineStoreService.setField('isLoading', true);

          try {
               // Always force refresh to ensure we have accountObjects
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true, // Make sure this is true
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: forceRefresh || true, // Force refresh to avoid missing data
               });

               // Safety check - if accountObjects is missing, refresh again
               if (!env.accountObjects?.result) {
                    console.warn('Account objects missing, retrying with force refresh');
                    const retryEnv = await this.txEnvironmentService.refreshEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeGatewayBalance: true,
                         forceRefresh: true,
                    });

                    if (!retryEnv.accountObjects?.result) {
                         throw new Error('Unable to fetch account objects');
                    }

                    // Update trustlines with retry data
                    const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(retryEnv.accountObjects, currentWallet);
                    this.trustlineStoreService.setField('existingIOUs', existingIOUs);

                    // Update balance
                    await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(retryEnv);
                    return;
               }

               // Update trustlines
               const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, currentWallet);
               this.trustlineStoreService.setField('existingIOUs', existingIOUs);

               // Check if current selection exists
               const currentCurrency = this.currencyStoreService.currency();
               const currentIssuer = this.currencyStoreService.issuer();

               if (currentCurrency && currentIssuer) {
                    const exists = existingIOUs.some((tl: any) => tl.currency === currentCurrency && tl.issuer === currentIssuer);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', exists);

                    // Check if trustline can be removed
                    if (exists && this.activeTab() === 'removeTrustline') {
                         const trustline = existingIOUs.find((tl: any) => tl.currency === currentCurrency && tl.issuer === currentIssuer);
                         if (trustline) {
                              const canRemove = this.canRemoveTrustline(trustline);
                              this.trustlineStoreService.setField('removeTrustlineAvailable', canRemove.canRemove);
                              this.trustlineStoreService.setField('removeTrustlineMessage', canRemove.reasons);
                         }
                    } else {
                         this.trustlineStoreService.setField('removeTrustlineAvailable', true);
                         this.trustlineStoreService.setField('removeTrustlineMessage', []);
                    }
               } else {
                    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               }

               // Update balance
               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);
          } catch (error) {
               console.error('Failed to load trustlines:', error);
               this.toastService.error('Failed to load trustlines', AppConstants.TOAST.ERROR);
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
     }

     async onCurrencyIssuerChange(): Promise<void> {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          const tab = this.activeTab();

          console.log(`[onCurrencyIssuerChange] ${tab} - ${currency}/${issuer}`);

          // FORCE FULL RESET EVERY TIME
          this.trustlineCurrencyService.clearFlagsValue(tab as any);

          this.trustlineStoreService.setField('trustlineAlreadyExist', false);
          this.trustlineStoreService.setField('removeTrustlineAvailable', true);
          this.trustlineStoreService.setField('removeTrustlineMessage', []);

          if (!currency || !issuer) {
               this.currencyStoreService.setField('amount', tab === 'removeTrustline' ? 0 : null);
               return;
          }

          try {
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    forceRefresh: true,
               });

               const exists = this.checkForExistingTrustline(env);

               if (exists && env.accountObjects) {
                    if (tab === 'removeTrustline') {
                         this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects);
                    } else if (tab === 'setTrustline') {
                         this.updateTrustLineFlagsInUI(env.accountObjects);
                    }
               }

               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

               console.log('[onCurrencyIssuerChange] FINAL flags:', JSON.stringify(this.trustlineCurrencyService.flags()));
          } catch (error) {
               console.error('[onCurrencyIssuerChange] Error:', error);
          }
     }

     private isSelfTrustlineForCurrent(): boolean {
          const wallet = this.walletManager.getSelectedWallet()?.classicAddress;
          const issuer = this.currencyStoreService.issuer();
          return !!(wallet && issuer && wallet === issuer);
     }

     async onCurrencyIssuerChange_234234234234234(): Promise<void> {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();

          console.log(`[onCurrencyIssuerChange] Checking for ${currency}/${issuer}`);

          // ALWAYS reset both flags first
          this.trustlineStoreService.setField('trustlineAlreadyExist', false);
          this.trustlineStoreService.setField('removeTrustlineAvailable', true);
          this.trustlineStoreService.setField('removeTrustlineMessage', []);

          if (!currency || !issuer) {
               this.currencyStoreService.setField('amount', this.activeTab() === 'removeTrustline' ? 0 : null);
               this.currencyStoreService.setField('balance', '0');
               console.log(`[onCurrencyIssuerChange] No currency or issuer, reset and returning`);
               return;
          }

          try {
               // Force refresh environment for the new pair
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: true,
               });

               // Check and update trustline existence
               const exists = this.checkForExistingTrustline(env);
               console.log(`[onCurrencyIssuerChange] Trustline exists: ${exists}`);

               // IMPORTANT: Also update removal availability for the Remove tab
               if (this.activeTab() === 'removeTrustline') {
                    const existingIOUs = this.trustlineStoreService.existingIOUs();
                    const trustline = existingIOUs.find((tl: any) => tl.currency === currency && tl.issuer === issuer);

                    if (trustline) {
                         const canRemove = this.canRemoveTrustline(trustline);
                         console.log(`[onCurrencyIssuerChange] Can remove: ${canRemove.canRemove}, Reasons: ${canRemove.reasons}`);
                         this.trustlineStoreService.setField('removeTrustlineAvailable', canRemove.canRemove);
                         this.trustlineStoreService.setField('removeTrustlineMessage', canRemove.reasons);
                    } else {
                         // No trustline exists for this pair
                         console.log(`[onCurrencyIssuerChange] No trustline found for removal`);
                         this.trustlineStoreService.setField('removeTrustlineAvailable', false);
                         this.trustlineStoreService.setField('removeTrustlineMessage', ['No trustline exists for this currency/issuer pair']);
                    }
               }

               // Update balance immediately
               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);
          } catch (error) {
               console.error('[onCurrencyIssuerChange] Error:', error);
          }
     }

     async onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency);

          const env = await this.txEnvironmentService.refreshEnvironment({
               includeTrustlines: true,
          });

          this.checkForExistingTrustline(env);
     }

     checkForExistingTrustline(env: any): boolean {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();

          console.log(`[checkForExistingTrustline] Checking for ${currency}/${issuer}`);

          if (!currency || !issuer) {
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               this.trustlineStoreService.setField('removeTrustlineAvailable', true);
               this.trustlineStoreService.setField('removeTrustlineMessage', []);
               this.currencyStoreService.setField('amount', this.activeTab() === 'removeTrustline' ? 0 : null);
               return false;
          }

          let trustLine: any = null;

          // First, try to find trustline in the environment
          if (env.trustlines?.result?.lines) {
               trustLine = env.trustlines.result.lines.find((line: any) => {
                    const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                    const matches = line.account === issuer && lineCurrency === this.utilsService.decodeIfNeeded(currency);
                    if (matches) {
                         console.log(`[checkForExistingTrustline] Found trustline in environment:`, line);
                    }
                    return matches;
               });
          } else {
               console.info('[checkForExistingTrustline] No trustlines in environment, checking stored IOUs');
          }

          // If not found in environment, check the stored IOUs (they were loaded earlier)
          if (!trustLine) {
               const existingIOUs = this.trustlineStoreService.existingIOUs();
               const storedTrustline = existingIOUs.find((tl: any) => tl.currency === currency && tl.issuer === issuer);
               if (storedTrustline) {
                    console.log(`[checkForExistingTrustline] Found trustline in stored IOUs:`, storedTrustline);
                    trustLine = storedTrustline;
               }
          }

          if (trustLine) {
               console.log(`[checkForExistingTrustline] Trustline EXISTS for ${currency}/${issuer}`);
               this.trustlineStoreService.setField('trustlineAlreadyExist', true);

               if (this.activeTab() === 'setTrustline') {
                    // Convert limit to number in case it comes back as a string from API
                    const limitValue = typeof trustLine.limit === 'string' ? Number(trustLine.limit) : trustLine.limit;
                    this.currencyStoreService.setField('amount', limitValue);
               } else if (this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', 0);
               }
               return true;
          } else {
               console.log(`[checkForExistingTrustline] Trustline DOES NOT EXIST for ${currency}/${issuer}`);
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               if (this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', this.activeTab() === 'removeTrustline' ? 0 : null);
               }
               return false;
          }
     }

     setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          console.log('=== setRemoveFlagsBasedOnExistingTrustline ===');

          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;

          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);
          if (!state) {
               console.log('[setRemoveFlags] No RippleState found');
               return;
          }

          const flags = state.Flags ?? 0;
          console.log(`[setRemoveFlags] Raw Flags: ${flags} (0b${flags.toString(2)})`);

          // Check BOTH sides
          const hasNoRipple = (flags & 0x00020000) !== 0 || (flags & 0x00040000) !== 0;
          const hasFreeze = (flags & 0x00100000) !== 0 || (flags & 0x00200000) !== 0;
          const hasDeepFreeze = (flags & 0x00400000) !== 0 || (flags & 0x00800000) !== 0;

          this.trustlineCurrencyService.flags.update(f => ({
               ...f,
               tfClearNoRipple: hasNoRipple,
               tfClearFreeze: hasFreeze,
               tfClearDeepFreeze: hasDeepFreeze,
          }));

          this.trustlineCurrencyService.updateFlagTotal();

          console.log(`[setRemoveFlags] FINAL -> NoRipple:${hasNoRipple}, Freeze:${hasFreeze}, DeepFreeze:${hasDeepFreeze}`);
     }

     updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse) {
          console.log('=== updateTrustLineFlagsInUI (Set tab) ===');

          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;

          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);
          if (!state) {
               this.trustlineCurrencyService.clearFlagsValue(this.activeTab());
               console.log('[updateTrustLineFlagsInUI] No state found - flags cleared');
               return;
          }

          const flags = state.Flags ?? 0;

          const hasNoRipple = (flags & 0x00020000) !== 0 || (flags & 0x00040000) !== 0;
          const hasFreeze = (flags & 0x00100000) !== 0 || (flags & 0x00200000) !== 0;
          const hasDeepFreeze = (flags & 0x00400000) !== 0 || (flags & 0x00800000) !== 0;

          this.trustlineCurrencyService.flags.update(f => ({
               tfSetfAuth: false,
               tfSetNoRipple: hasNoRipple,
               tfClearNoRipple: false,
               tfSetFreeze: hasFreeze,
               tfClearFreeze: false,
               tfSetDeepFreeze: hasDeepFreeze,
               tfClearDeepFreeze: false,
          }));

          this.trustlineCurrencyService.updateFlagTotal();

          console.log(`[updateTrustLineFlagsInUI] Applied -> NoRipple:${hasNoRipple}, Freeze:${hasFreeze}, DeepFreeze:${hasDeepFreeze}`);
     }

     updateTrustLineFlagsInUI_5465456465454(accountObjects: xrpl.AccountObjectsResponse) {
          console.log('updateTrustLineFlagsInUI.........................');
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          const activeTab = this.activeTab();

          // Reset all UI flags first
          this.trustlineCurrencyService.flags.update(currentFlags => {
               const reset: Record<TrustlineFlagKey, boolean> = {
                    tfSetfAuth: false,
                    tfSetNoRipple: false,
                    tfClearNoRipple: false,
                    tfSetFreeze: false,
                    tfClearFreeze: false,
                    tfSetDeepFreeze: false,
                    tfClearDeepFreeze: false,
               };
               return reset;
          });

          if (!currency || !issuer) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;

          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);

          if (!state) {
               if (activeTab !== 'removeTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = TRUSTLINE.LEDGER_FLAG_MAP;

          // Side-specific evaluations
          const authSet = isLowSide ? flags & map.lsfLowAuth : flags & map.lsfHighAuth;
          const noRippleSet = isLowSide ? (flags & map.lsfLowNoRipple) !== 0 : (flags & map.lsfHighNoRipple) !== 0;
          const freezeSet = isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze;
          const deepFreezeSet = isLowSide ? flags & map.lsfLowDeepFreeze : flags & map.lsfHighDeepFreeze;

          if (activeTab === 'removeTrustline') {
               if (noRippleSet) {
                    this.trustlineCurrencyService.flags.update(f => {
                         f.tfClearNoRipple = true;
                         return f;
                    });
               }

               if (freezeSet) {
                    this.trustlineCurrencyService.flags.update(f => {
                         f.tfClearFreeze = true;
                         return f;
                    });
               }

               if (deepFreezeSet) {
                    this.trustlineCurrencyService.flags.update(f => {
                         f.tfClearDeepFreeze = true;
                         return f;
                    });
               }
          } else {
               this.trustlineCurrencyService.flags.update(f => {
                    f.tfSetfAuth = !!authSet;

                    f.tfSetNoRipple = !!noRippleSet;
                    f.tfSetFreeze = !!freezeSet;
                    f.tfSetDeepFreeze = !!deepFreezeSet;
                    return f;
               });
          }

          this.trustlineCurrencyService.updateFlagTotal();
     }

     setRemoveFlagsBasedOnExistingTrustline_546456465456654(accountObjects: xrpl.AccountObjectsResponse) {
          console.log('setRemoveFlagsBasedOnExistingTrustline************************');
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();

          // Force reset ALL flags first, then only enable the required clears
          this.trustlineCurrencyService.flags.update(f => ({
               tfSetfAuth: false,
               tfSetNoRipple: false,
               tfClearNoRipple: false,
               tfSetFreeze: false,
               tfClearFreeze: false,
               tfSetDeepFreeze: false,
               tfClearDeepFreeze: false,
          }));

          if (!currency || !issuer || !this.walletManager.getSelectedWallet()?.address) {
               this.trustlineCurrencyService.updateFlagTotal();
               return;
          }

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;
          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);

          if (!state) {
               this.trustlineCurrencyService.updateFlagTotal();
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = TRUSTLINE.LEDGER_FLAG_MAP;

          const noRippleSet = isLowSide ? (flags & map.lsfLowNoRipple) !== 0 : (flags & map.lsfHighNoRipple) !== 0;
          const freezeSet = isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze;
          const deepFreezeSet = isLowSide ? flags & map.lsfLowDeepFreeze : flags & map.lsfHighDeepFreeze;

          // Removal requires clearing these if present
          if (noRippleSet) {
               this.trustlineCurrencyService.flags.update(f => {
                    f.tfClearNoRipple = true;
                    return f;
               });
          }
          if (freezeSet) {
               this.trustlineCurrencyService.flags.update(f => {
                    f.tfClearFreeze = true;
                    return f;
               });
          }

          if (deepFreezeSet) {
               this.trustlineCurrencyService.flags.update(f => {
                    f.tfClearDeepFreeze = true;
                    return f;
               });
          }

          this.trustlineCurrencyService.updateFlagTotal();
     }

     isAddValid(): boolean {
          const currency = this.currencyStoreService.newCurrency()?.trim();
          const issuer = this.currencyStoreService.newIssuer()?.trim();

          if (!currency || !issuer) return false;
          if (!this.utilsService.isValidCurrencyCode(currency)) return false;
          if (!xrpl.isValidAddress(issuer)) return false;

          const existing = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          return !existing.includes(issuer);
     }

     isRemoveValid(): boolean {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          return !!currency && currency !== 'XRP' && !!issuer;
     }

     addNewCurrencyIssuer(): void {
          const currency = this.currencyStoreService.newCurrency();
          const issuer = this.currencyStoreService.newIssuer();

          if (!this.isAddValid()) {
               this.toastService.error(`Invalid currency code or issuer address, or already exists.`, AppConstants.TOAST.ERROR);
               return;
          }

          this.trustlineCurrencyService.addToken(currency, issuer);

          this.onCurrencyChange(currency);

          this.currencyStoreService.setField('newCurrency', '');
          this.currencyStoreService.setField('newIssuer', '');

          this.toastService.success('Currency/Issuer added successfully');
     }

     removeCurrentCurrencyIssuer(): void {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();

          if (!this.isRemoveValid()) {
               this.toastService.error(`No valid currency or issuer selected to remove.`, AppConstants.TOAST.ERROR);
               return;
          }

          this.trustlineCurrencyService.removeToken(currency, issuer);

          this.toastService.success('Currency/Issuer removed successfully');

          const remainingIssuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          if (remainingIssuers.length === 0) {
               const available = this.trustlineCurrencyService.currencies();
               if (available.length > 0) {
                    this.onCurrencyChange(available[0]);
               }
          }
     }

     canRemoveTrustline(trustline: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          // Parse balance and limit as numbers
          const balance = typeof trustline.balance === 'string' ? Number.parseFloat(trustline.balance) : Number(trustline.balance);
          const limit = typeof trustline.limit === 'string' ? Number.parseFloat(trustline.limit) : Number(trustline.limit);

          console.log(`[canRemoveTrustline] Checking trustline:`, {
               currency: trustline.currency,
               issuer: trustline.issuer,
               balance: balance,
               limit: limit,
               flags: trustline.flags,
          });

          // Check balance (must be 0)
          if (balance !== 0) {
               reasons.push(`Balance is ${trustline.balance} (must be 0 to remove)`);
          }

          // Check limit (must be 0)
          // if (limit !== 0) {
          //      reasons.push(`Limit is ${trustline.limit} (must be 0 to remove)`);
          // }

          // Check if frozen
          if (trustline.flags?.includes('Freeze')) {
               reasons.push(`Trustline is frozen - must be unfrozen first`);
          }

          // Check NoRipple flag
          if (trustline.flags?.includes('NoRipple')) {
               const clearNoRipple = this.trustlineCurrencyService.flags().tfClearNoRipple;
               if (!clearNoRipple) {
                    reasons.push(`NoRipple flag is set - must be cleared before removal`);
               }
          }

          // Check if authorized
          if (trustline.flags?.includes('Authorized')) {
               reasons.push(`Trustline is authorized - must be unauthorised first`);
          }

          const canRemove = reasons.length === 0;
          console.log(`[canRemoveTrustline] Can remove: ${canRemove}, Reasons: ${reasons}`);

          return {
               canRemove,
               reasons,
          };
     }
}
