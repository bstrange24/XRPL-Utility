import { inject, Injectable, signal } from '@angular/core';
import { AppConstants } from '../../../core/app.constants';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
import * as xrpl from 'xrpl';
import { TrustlineActionTypes, TrustlineFlagKey } from '../../../components/trustlines/constants/trustline.types';
import { UtilsService } from '../../util-service/utils.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TRUSTLINE } from '../../../components/trustlines/constants/trustline.constants';

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

     readonly activeTab = signal<TrustlineActionTypes>('setTrustline');

     async loadTrustlines(forceRefresh = false): Promise<void> {
          // Only show loading when we really need fresh data (wallet change or explicit refresh)
          this.trustlineStoreService.setField('isLoading', true);

          try {
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    forceRefresh,
               });

               this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects!, this.walletManager.getSelectedWallet()!.classicAddress));

               const activeTab = this.activeTab();
               const trustLineExists = this.checkForExistingTrustline(env);

               if (trustLineExists) {
                    if (activeTab === 'setTrustline') this.updateTrustLineFlagsInUI(env.accountObjects!);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', true);
               } else {
                    if (activeTab === 'setTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               }

               if (activeTab === 'removeTrustline') {
                    this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects!);
               }
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
     }

     async loadTrustlines1(forceRefresh = false): Promise<void> {
          // Show loading in the summary panel while we fetch
          this.trustlineStoreService.setField('isLoading', true);

          try {
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    forceRefresh,
               });

               // Update data only after successful fetch (no flicker)
               this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects!, this.walletManager.getSelectedWallet()!.classicAddress));

               const activeTab = this.activeTab();
               const trustLineExists = this.checkForExistingTrustline(env);

               if (trustLineExists) {
                    if (activeTab === 'setTrustline') this.updateTrustLineFlagsInUI(env.accountObjects!);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', true);
               } else {
                    if (activeTab === 'setTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               }

               if (activeTab === 'removeTrustline') {
                    this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects!);
               }
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
     }

     async onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency);

          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeTrustlines: true,
          });

          this.checkForExistingTrustline(env);
     }

     checkForExistingTrustline(env: any): boolean {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();

          if (!currency || !issuer) {
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               this.currencyStoreService.setField('amount', 0);
               return false;
          }

          const trustLine = env.trustlines?.result.lines.find((line: any) => {
               const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
               return line.account === issuer && lineCurrency === this.utilsService.decodeIfNeeded(currency);
          });

          if (trustLine) {
               this.trustlineStoreService.setField('trustlineAlreadyExist', true);

               // For Set tab: pre-fill limit
               if (this.activeTab() === 'setTrustline') {
                    this.currencyStoreService.setField('amount', trustLine.limit);
               } else if (this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', 0);
               }

               // Balance is handled via displayedBalance() computed signal
               return true;
          } else {
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);

               if (this.activeTab() === 'setTrustline') {
                    this.currencyStoreService.setField('amount', 0);
               } else if (this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', 0);
               }

               return false;
          }
     }

     updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse) {
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

     setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
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
               this.txUiService.setError('Invalid currency code or issuer address, or already exists');
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
               this.txUiService.setError('No valid currency or issuer selected to remove');
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

     canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];
          const balance = Number(line.balance);

          if (balance !== 0) reasons.push(`Balance is ${line.balance} (must be 0)`);
          if (line.freeze) reasons.push(`Trustline is frozen`);
          if (line.no_ripple && !this.trustlineCurrencyService.flags().tfClearNoRipple) reasons.push(`NoRipple flag must be cleared`);
          if (line.authorized) reasons.push(`Trustline is authorized (issuer must unauthorize first)`);
          if (line.peer_authorized) reasons.push(`Peer authorization is enabled`);

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
     }
}
