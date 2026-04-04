import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

export interface AmmState {
     assetPool1Balance: string;
     assetPool2Balance: string;
     lpTokenBalance: string;
     weWantCurrency: string;
     weSpendCurrency: string;
     availableCurrencies: string[];
     weWantIssuer: string;
     weSpendIssuer: string;
     weWantAmount: string;
     weSpendAmount: string;
     isMarketOrder: boolean;
     isFillOrKill: boolean;
     isPassive: boolean;
     existingOffers: any[];
     existingSellOffers: any[];
     existingBuyOffers: any[];
     holderField: string;
     insufficientLiquidityWarning: boolean;
     lpTokenBalanceField: string;
     tradingFeeField: string;
     withdrawlLpTokenFromPoolField: string;

     nftId: string;
     nftIndex: string;
     nftOfferId: string;
     selectedNftOfferIndex: string;
     destination: string;
     amount: string;
     ammIdSearchQuery: string;
     transferFee: number;
     outstandingNfts: string;
     expiration: string;
     outstandingNftsCollapsed: boolean;
     existingNftsCollapsed: boolean;
     existingSellOffersCollapsed: boolean;
     issuerAddress: string;
     enableExpirationDate: boolean;
     nftCountField: string;
     isCollapsed: boolean;
}

const initialState: AmmState = {
     assetPool1Balance: '',
     assetPool2Balance: '',
     lpTokenBalance: '',
     weWantCurrency: '',
     weSpendCurrency: 'XRP',
     availableCurrencies: [],
     weWantIssuer: '',
     weSpendIssuer: '',
     weWantAmount: '',
     weSpendAmount: '',
     isMarketOrder: false,
     isFillOrKill: false,
     isPassive: true,
     existingOffers: [],
     existingSellOffers: [],
     existingBuyOffers: [],
     holderField: '',
     insufficientLiquidityWarning: false,
     lpTokenBalanceField: '0',
     tradingFeeField: '0.1',
     withdrawlLpTokenFromPoolField: '',

     nftId: '',
     nftIndex: '',
     nftOfferId: '',
     selectedNftOfferIndex: '',
     destination: '',
     amount: '',
     ammIdSearchQuery: '',
     transferFee: 0,
     outstandingNfts: '',
     outstandingNftsCollapsed: false,
     existingNftsCollapsed: false,
     existingSellOffersCollapsed: false,
     issuerAddress: '',
     expiration: '',
     nftCountField: '',
     enableExpirationDate: false,
     isCollapsed: false,
};

export const AmmStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(store => ({
          expiration: computed(() => store.expiration()),
     })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof AmmState>(field: K, value: AmmState[K]) {
               patchState(store, { [field]: value });
          },

          setExpiration(value: string) {
               patchState(store, { expiration: value });
          },

          /** Generic updater */
          updateField<K extends keyof AmmState>(field: K, updater: (current: AmmState[K]) => AmmState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Clear expiration */
          clearExpiration() {
               patchState(store, { expiration: '' });
          },

          /** Reset dropdown-related fields */
          resetNftIdSelection() {
               patchState(store, {
                    nftId: '',
                    nftIndex: '',
                    amount: '',
               });
          },

          /** Reset AMM form fields */
          resetAmmFields() {
               patchState(store, {
                    nftId: '',
                    nftIndex: '',
                    nftOfferId: '',
                    expiration: '',
                    enableExpirationDate: false,
                    issuerAddress: '',
                    nftCountField: '',
                    destination: '',
                    ammIdSearchQuery: '',
                    outstandingNfts: '',
                    amount: '',
                    transferFee: 0,
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): AmmState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal functions (methods)
                         }
                    }
               }
               return snapshot as AmmState;
          },
     }))
);
