import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface DidState {
     didData: string;
     uriData: string;
     didDocumentData: string;
     createdDids: boolean;
     existingDid: any[];
     regularKeySigningEnabled: boolean;
}

const initialState: DidState = {
     didData: '',
     uriData: '',
     didDocumentData: '',
     createdDids: false,
     existingDid: [],
     regularKeySigningEnabled: false,
};

export const DidStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof DidState>(field: K, value: DidState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof DidState>(field: K, updater: (current: DidState[K]) => DidState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          clearDidFields() {
               patchState(store, {
                    didData: '',
                    uriData: '',
                    didDocumentData: '',
               });
          },

          /** Snapshot */
          getAll(): DidState {
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
               return snapshot as DidState;
          },
     }))
);
