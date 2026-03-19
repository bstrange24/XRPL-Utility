import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface AccountDeleteState {
     accountInfo: any;
     accountObjects: any;
     serverInfo: any;
     blockingObjects: any;
     savedTxJson: any[];
     savedTxResult: any[];
     destination: string;
}

const initialState: AccountDeleteState = {
     accountInfo: [],
     accountObjects: [],
     serverInfo: [],
     blockingObjects: [],
     savedTxJson: [],
     savedTxResult: [],
     destination: '',
};

export const AccountDeleteStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof AccountDeleteState>(field: K, value: AccountDeleteState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof AccountDeleteState>(field: K, updater: (current: AccountDeleteState[K]) => AccountDeleteState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          resetFields() {
               patchState(store, { blockingObjects: [] });
          },

          /** Snapshot */
          getAll(): AccountDeleteState {
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
               return snapshot as AccountDeleteState;
          },
     }))
);
