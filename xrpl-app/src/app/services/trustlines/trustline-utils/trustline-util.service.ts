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

  console.log(`Loading trustlines for wallet: ${currentWallet.slice(0,8)}...`);
  this.trustlineStoreService.setField('isLoading', true);

  try {
    // Simple fetch - no complex caching logic
    const env = await this.txEnvironmentService.refreshEnvironment({
      includeAccountInfo: true,
      includeAccountObject: true,
      includeTrustlines: true,
      includeGatewayBalance: true,
      forceRefresh: true,
    });

    // Update trustlines
    const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(
      env.accountObjects!, 
      currentWallet
    );
    this.trustlineStoreService.setField('existingIOUs', existingIOUs);

    // Check if current selection exists
    const currentCurrency = this.currencyStoreService.currency();
    const currentIssuer = this.currencyStoreService.issuer();
    
    if (currentCurrency && currentIssuer) {
      const exists = existingIOUs.some(
        (tl: any) => tl.currency === currentCurrency && tl.issuer === currentIssuer
      );
      this.trustlineStoreService.setField('trustlineAlreadyExist', exists);
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

     async loadTrustlines23(forceRefresh = false): Promise<void> {
   const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;
  console.log(`[loadTrustlines] START - Wallet: ${currentWallet?.slice(0,8)}..., ForceRefresh: ${forceRefresh}`);
  
  if (!currentWallet) {
    console.log(`[loadTrustlines] No wallet, clearing state`);
    this.trustlineStoreService.setField('existingIOUs', []);
    this.trustlineStoreService.setField('isLoading', false);
    return;
  }

  this.trustlineStoreService.setField('isLoading', true);
  
  const savedCurrency = this.currencyStoreService.currency();
  const savedIssuer = this.currencyStoreService.issuer();
  console.log(`[loadTrustlines] Saved selection: ${savedCurrency}/${savedIssuer?.slice(0,8)}...`);

  try {
         console.log(`[loadTrustlines] Fetching fresh environment...`);

    // Always fetch fresh - no cache
    const env = await this.txEnvironmentService.refreshEnvironment({
      includeAccountInfo: true,
      includeAccountObject: true,
      includeTrustlines: true,
      includeGatewayBalance: true,
      forceRefresh: true, // Always force refresh
    });
        console.log(`[loadTrustlines] Environment fetched`);


    // Update trustlines
    const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(
      env.accountObjects!, 
      currentWallet
    );
    console.log(`[loadTrustlines] Got ${existingIOUs.length} trustlines`);
    this.trustlineStoreService.setField('existingIOUs', existingIOUs);

    // Restore selection if it exists in the new data
    if (savedCurrency && savedIssuer) {
      const selectionExists = existingIOUs.some(
        (tl: any) => tl.currency === savedCurrency && tl.issuer === savedIssuer
      );
            console.log(`[loadTrustlines] Selection exists in new wallet: ${selectionExists}`);


      if (!selectionExists && existingIOUs.length > 0) {
        console.log(`[loadTrustlines] Changing selection to first available: ${existingIOUs[0].currency}/${existingIOUs[0].issuer?.slice(0,8)}...`);
        this.currencyStoreService.setCurrency(existingIOUs[0].currency);
        this.currencyStoreService.setIssuer(existingIOUs[0].issuer);
      }
    }

    const activeTab = this.activeTab();
    const trustLineExists = this.checkForExistingTrustline(env);
        console.log(`[loadTrustlines] Trustline exists: ${trustLineExists}, Active tab: ${activeTab}`);


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

    // Update balance from fresh environment
    await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);
     console.log(`[loadTrustlines] Balance refreshed from env`);

    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
  } catch (error) {
    console.error('Failed to load trustlines:', error);
    this.toastService.error('Failed to load trustlines', AppConstants.TOAST.ERROR);
  } finally {
    this.trustlineStoreService.setField('isLoading', false);
  }
}

     async loadTrustlines25(forceRefresh = false): Promise<void> {
          const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;
          if (!currentWallet) {
               // ✅ Clear state if no wallet selected
               this.trustlineStoreService.setField('existingIOUs', []);
               this.trustlineStoreService.setField('isLoading', false);
               return;
          }

          // ✅ Track current wallet to prevent stale updates
          const requestWallet = currentWallet;
          this.trustlineStoreService.setField('isLoading', true);

          try {
               let env: any;

               if (forceRefresh) {
                    env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: true,
                    });
               } else {
                    env = await this.txEnvironmentService.getValidatedEnvironment(false);
                    
                    if (!env.gatewayBalanceObject) {
                    env = await this.txEnvironmentService.refreshEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeGatewayBalance: true,
                         forceRefresh: false,
                    });
                    }
               }

               // ✅ CRITICAL: Only update state if wallet hasn't changed during the request
               const currentWalletAfterRequest = this.walletManager.getSelectedWallet()?.classicAddress;
               if (currentWalletAfterRequest !== requestWallet) {
                    console.log('Wallet changed during request, discarding results');
                    return;
               }

               // Update trustlines
               this.trustlineStoreService.setField('existingIOUs', 
                    this.trustlineCurrencyService.getExistingIOUs(
                    env.accountObjects, 
                    currentWalletAfterRequest!
                    )
               );

               const activeTab = this.activeTab();
               const trustLineExists = this.checkForExistingTrustline(env);

               if (trustLineExists) {
                    if (activeTab === 'setTrustline') this.updateTrustLineFlagsInUI(env.accountObjects);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', true);
               } else {
                    if (activeTab === 'setTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               }

               if (activeTab === 'removeTrustline') {
                    this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects);
               }

               // Update balance
               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

               this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          } catch (error) {
               console.error('Failed to load trustlines:', error);
               // ✅ Only show error if wallet hasn't changed
               const currentWalletAfterError = this.walletManager.getSelectedWallet()?.classicAddress;
               if (currentWalletAfterError === requestWallet) {
                    this.toastService.error('Failed to load trustlines', AppConstants.TOAST.ERROR);
               }
          } finally {
               // ✅ Only clear loading state if wallet hasn't changed
               const finalWallet = this.walletManager.getSelectedWallet()?.classicAddress;
               if (finalWallet === requestWallet) {
                    this.trustlineStoreService.setField('isLoading', false);
               }
          }
     }

     async loadTrustlines4(forceRefresh = false): Promise<void> {
  const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;
  if (!currentWallet) return;

  this.trustlineStoreService.setField('isLoading', true);

  try {
    // Always include gateway balance for proper balance display
    let env: any;

    if (forceRefresh) {
      env = await this.txEnvironmentService.refreshEnvironment({
        includeAccountInfo: true,
        includeAccountObject: true,
        includeTrustlines: true,
        includeGatewayBalance: true,
        forceRefresh: true,
      });
    } else {
      env = await this.txEnvironmentService.getValidatedEnvironment(false);
      
      // If we don't have gateway balance, refresh to get it
      if (!env.gatewayBalanceObject) {
        env = await this.txEnvironmentService.refreshEnvironment({
          includeAccountInfo: true,
          includeAccountObject: true,
          includeTrustlines: true,
          includeGatewayBalance: true,
          forceRefresh: false,
        });
      }
    }

    // Update trustlines
    this.trustlineStoreService.setField('existingIOUs', 
      this.trustlineCurrencyService.getExistingIOUs(
        env.accountObjects, 
        this.walletManager.getSelectedWallet()!.classicAddress
      )
    );

    const activeTab = this.activeTab();
    const trustLineExists = this.checkForExistingTrustline(env);

    if (trustLineExists) {
      if (activeTab === 'setTrustline') this.updateTrustLineFlagsInUI(env.accountObjects);
      this.trustlineStoreService.setField('trustlineAlreadyExist', true);
    } else {
      if (activeTab === 'setTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
      this.trustlineStoreService.setField('trustlineAlreadyExist', false);
    }

    if (activeTab === 'removeTrustline') {
      this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects);
    }

    // CRITICAL: Always refresh balance after loading trustlines
    await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
  } finally {
    this.trustlineStoreService.setField('isLoading', false);
  }
     }

     async onCurrencyIssuerChange(): Promise<void> {
          const currency = this.currencyStoreService.currency();
          const issuer = this.currencyStoreService.issuer();
          
          if (!currency || !issuer) {
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               this.currencyStoreService.setField('amount', 0);
               this.currencyStoreService.setField('balance', '0');
               return;
          }

          // Force refresh environment for the new pair
          const env = await this.txEnvironmentService.refreshEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               includeTrustlines: true,
               includeGatewayBalance: true,
               forceRefresh: true,
          });

          // Update trustline existence
          this.checkForExistingTrustline(env);
          
          // Update balance immediately
          await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);
          
          // Force UI update by triggering signal updates
          this.trustlineStoreService.setField('isLoaded', false);
          this.trustlineStoreService.setField('isLoaded', true);
     }

     async loadTrustlines2(forceRefresh = false): Promise<void> {
          const currentWallet = this.walletManager.getSelectedWallet()?.classicAddress;
          if (!currentWallet) return;

          this.trustlineStoreService.setField('isLoading', true);

          try {
               let env: any;

               if (forceRefresh) {
                    env = await this.txEnvironmentService.refreshEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeGatewayBalance: true,
                         forceRefresh: true,
                    });
               } else {
                    // Light / cached version - much faster
                    env = await this.txEnvironmentService.getValidatedEnvironment(false);
               }

               // Update trustlines only when necessary
               if (forceRefresh || this.trustlineStoreService.existingIOUs().length === 0) {
                    this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, this.walletManager.getSelectedWallet()!.classicAddress));
               }

               const activeTab = this.activeTab();
               const trustLineExists = this.checkForExistingTrustline(env);

               if (trustLineExists) {
                    if (activeTab === 'setTrustline') this.updateTrustLineFlagsInUI(env.accountObjects);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', true);
               } else {
                    if (activeTab === 'setTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
                    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
               }

               if (activeTab === 'removeTrustline') {
                    this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects);
               }

               // Use already-fetched env for balance (huge win)
               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

               this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
     }

     async loadTrustlines1(forceRefresh = false): Promise<void> {
          // Only show loading when we really need fresh data (wallet change or explicit refresh)
          this.trustlineStoreService.setField('isLoading', true);

          try {
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
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

               // Update the balance from the already-fetched env (no extra network call)
               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

               this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               this.acccountDataService.refreshUiStateAccountConfigure(env.wallet, env);
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
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

    if (this.activeTab() === 'setTrustline') {
      this.currencyStoreService.setField('amount', trustLine.limit);
    } else if (this.activeTab() === 'removeTrustline') {
      this.currencyStoreService.setField('amount', 0);
    }
    return true;
  } else {
    this.trustlineStoreService.setField('trustlineAlreadyExist', false);
    if (this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline') {
      this.currencyStoreService.setField('amount', 0);
    }
    return false;
  }
}

     checkForExistingTrustline12(env: any): boolean {
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

                // Update balance from the trustline data
    const balance = trustLine.balance || '0';
    this.currencyStoreService.setField('balance', balance);

               // Balance is handled via displayedBalance() computed signal
               return true;
          } else {
               this.trustlineStoreService.setField('trustlineAlreadyExist', false);

               if (this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline') {
                    this.currencyStoreService.setField('amount', 0);
               }

  return !!trustLine;          }
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
