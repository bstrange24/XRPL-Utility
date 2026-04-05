import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

export interface OfferState {
     weWantCurrency: string;
     weWantIssuer: string;
     weWantAmount: string;
     weSpendCurrency: string;
     weSpendIssuer: string;
     weSpendAmount: string;
     offerSequenceField: string;
     isMarketOrder: boolean;
     isPassive: boolean;
     isFillOrKill: boolean;
     existingOffers: any[];
     offersArray: any[];
     insufficientLiquidityWarning: boolean;
     orderBookPair: string;
     orderBookStats: any | null;
}

const initialState: OfferState = {
     weWantCurrency: '',
     weWantIssuer: '',
     weWantAmount: '',
     weSpendCurrency: 'XRP',
     weSpendIssuer: '',
     weSpendAmount: '',
     offerSequenceField: '',
     isMarketOrder: false,
     isPassive: true,
     isFillOrKill: false,
     existingOffers: [],
     offersArray: [],
     insufficientLiquidityWarning: false,
     orderBookPair: '',
     orderBookStats: null,
};

export const OfferStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(() => ({})),

     withMethods(store => ({
          setField<K extends keyof OfferState>(field: K, value: OfferState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof OfferState>(field: K, updater: (current: OfferState[K]) => OfferState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          resetOfferFields() {
               patchState(store, {
                    weWantAmount: '',
                    weSpendAmount: '',
                    offerSequenceField: '',
                    isMarketOrder: false,
                    isPassive: true,
                    isFillOrKill: false,
                    insufficientLiquidityWarning: false,
               });
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          getAll(): OfferState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal methods
                         }
                    }
               }
               return snapshot as OfferState;
          },
     }))
);
