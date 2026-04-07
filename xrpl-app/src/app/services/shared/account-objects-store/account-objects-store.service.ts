import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface SharedAccountObjectsState {
     address: string;
     accountObjects: any | null;
     accountInfo: any | null;
}

const initialState: SharedAccountObjectsState = {
     address: '',
     accountObjects: null,
     accountInfo: null,
};

/**
 * Root-level singleton that holds the most recently fetched account objects and info
 * for the currently selected wallet.  Every page component writes to this store after
 * a successful environment fetch so that the next page the user navigates to can read
 * stale-but-useful data synchronously before its own network request completes.
 */
export const AccountObjectsStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof SharedAccountObjectsState>(field: K, value: SharedAccountObjectsState[K]) {
               patchState(store, { [field]: value });
          },

          update(address: string, accountObjects: any, accountInfo: any) {
               patchState(store, { address, accountObjects, accountInfo });
          },

          reset() {
               patchState(store, structuredClone(initialState));
          },
     }))
);
