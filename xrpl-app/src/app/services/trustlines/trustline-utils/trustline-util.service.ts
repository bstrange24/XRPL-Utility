import { inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import * as xrpl from 'xrpl';
import { TrustlineActionTypes } from '../../../components/trustlines/constants/trustline.types';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
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

          this.trustlineStoreService.setField('isLoading', true);

          try {
               // Always force refresh to ensure we have accountObjects
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: forceRefresh,
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
          } catch (error) {
               console.error('[onCurrencyIssuerChange] Error:', error);
          }
     }

     private isSelfTrustlineForCurrent(): boolean {
          const wallet = this.walletManager.getSelectedWallet()?.classicAddress;
          const issuer = this.currencyStoreService.issuer();
          return !!(wallet && issuer && wallet === issuer);
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
                    return line.account === issuer && lineCurrency === this.utilsService.decodeIfNeeded(currency);
               });
          } else {
               // No trustlines returned in the environment; fall back to previously cached trustlines.
          }

          // If not found in environment, check the stored IOUs (they were loaded earlier)
          if (!trustLine) {
               const existingIOUs = this.trustlineStoreService.existingIOUs();
               const storedTrustline = existingIOUs.find((tl: any) => tl.currency === currency && tl.issuer === issuer);
               if (storedTrustline) {
                    trustLine = storedTrustline;
               }
          }

          if (trustLine) {
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
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               if (this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', this.activeTab() === 'removeTrustline' ? 0 : null);
               }
               return false;
          }
     }

     setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;

          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);
          if (!state) {
               return;
          }

          const flags = state.Flags ?? 0;

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
     }

     updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse) {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          if (!currency || !issuer) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.walletManager.getSelectedWallet()?.classicAddress || this.walletManager.getSelectedWallet()?.address;

          const state = this.trustlineCurrencyService.getTrustlineState(accountObjects, walletAddr!, issuer, encoded);
          if (!state) {
               this.trustlineCurrencyService.clearFlagsValue(this.activeTab());
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

          // Keep the removal criteria simple and stable

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

          return {
               canRemove,
               reasons,
          };
     }
}
