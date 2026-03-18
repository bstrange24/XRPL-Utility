import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface DeleteAccountState {
     accountInfo: any;
     accountObjects: any;
     serverInfo: any;
     blockingObjects: any;
     savedTxJson: any[];
     savedTxResult: any[];
}

const initialState: DeleteAccountState = {
     accountInfo: [],
     accountObjects: [],
     serverInfo: [],
     blockingObjects: [],
     savedTxJson: [],
     savedTxResult: [],
};

export const DeleteAccountStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof DeleteAccountState>(field: K, value: DeleteAccountState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof DeleteAccountState>(field: K, updater: (current: DeleteAccountState[K]) => DeleteAccountState[K]) {
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
          getAll(): DeleteAccountState {
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
               return snapshot as DeleteAccountState;
          },
     }))
);
