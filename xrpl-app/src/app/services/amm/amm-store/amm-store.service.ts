import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

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
     destination: string;
     amount: string;
     ammIdSearchQuery: string;
     transferFee: number;
     expiration: string;
     issuerAddress: string;
     isCollapsed: boolean;
     isLiquidityProvider: boolean;
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
     destination: '',
     amount: '',
     ammIdSearchQuery: '',
     transferFee: 0,
     issuerAddress: '',
     expiration: '',
     isCollapsed: false,
     isLiquidityProvider: false,
};

export const AmmStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     // withComputed(store => ({
     //      expiration: computed(() => store.expiration()),
     // })),

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
                    amount: '',
               });
          },

          /** Reset AMM form fields */
          resetAmmFields() {
               patchState(store, {
                    expiration: '',
                    issuerAddress: '',
                    destination: '',
                    ammIdSearchQuery: '',
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
