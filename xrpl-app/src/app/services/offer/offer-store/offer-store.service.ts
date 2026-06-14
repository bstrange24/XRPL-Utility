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
     selectedOffersToCancel: any[];
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
     weSpendIssuer: '', // XRP has no issuer
     weSpendAmount: '',
     offerSequenceField: '',
     isMarketOrder: false,
     isPassive: true,
     isFillOrKill: false,
     existingOffers: [],
     selectedOffersToCancel: [],
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
               return {
                    weWantCurrency: store.weWantCurrency(),
                    weWantIssuer: store.weWantIssuer(),
                    weWantAmount: store.weWantAmount(),
                    weSpendCurrency: store.weSpendCurrency(),
                    weSpendIssuer: store.weSpendIssuer(),
                    weSpendAmount: store.weSpendAmount(),
                    offerSequenceField: store.offerSequenceField(),
                    isMarketOrder: store.isMarketOrder(),
                    isPassive: store.isPassive(),
                    isFillOrKill: store.isFillOrKill(),
                    existingOffers: store.existingOffers(),
                    selectedOffersToCancel: store.selectedOffersToCancel(),
                    offersArray: store.offersArray(),
                    insufficientLiquidityWarning: store.insufficientLiquidityWarning(),
                    orderBookPair: store.orderBookPair(),
                    orderBookStats: store.orderBookStats(),
               };
          },
     }))
);
