import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { CurrencyState } from '../constants/currency.types';

const initialState: CurrencyState = {
     currencyCode: '',
     currencyIssuer: '',
     lastCurrency: '',
     lastIssuer: '',
     userAddedissuerFields: '',
     newCurrency: '',
     newIssuer: '',
     issuerToRemove: '',
     currency: '', // Start empty, not XRP
     issuer: '', // Start empty
     amount: 0,
     balance: '0', // Initialize with '0' not empty string
     isIssuer: false,
     destination: '',
};

export const CurrencyStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setCurrency(item: any) {
               const value = item?.value ?? item;
               patchState(store, {
                    currency: value,
                    currencyCode: value,
               });
          },

          setIssuer(item: any) {
               const value = item?.value ?? item;
               patchState(store, {
                    issuer: value,
                    currencyIssuer: value,
               });
          },

          setAmount(amount: number) {
               patchState(store, { amount });
          },

          // Generic
          setField<K extends keyof CurrencyState>(field: K, value: CurrencyState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof CurrencyState>(field: K, updater: (current: CurrencyState[K]) => CurrencyState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          reset() {
               patchState(store, initialState);
          },

          /** Snapshot */
          getAll(): CurrencyState {
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
               return snapshot as CurrencyState;
          },

          resetOptions() {
               patchState(store, {
                    currencyCode: 'XRP',
                    currencyIssuer: '',
                    lastCurrency: '',
                    lastIssuer: '',
                    userAddedissuerFields: '',
                    newCurrency: '',
                    newIssuer: '',
                    issuerToRemove: '',
                    currency: '',
                    issuer: '',
               });
          },
     }))
);
