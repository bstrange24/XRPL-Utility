import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { TrustlineState } from '../../../components/trustlines/constants/trustline.types';
import { computed } from '@angular/core';

const initialState: TrustlineState = {
     isLoaded: false,
     isLoading: false,
     error: '',
     trustlineAlreadyExist: false,
     removeTrustlineAvailable: true,
     removeTrustlineMessage: [],
     showTrustlineOptions: false,
     outstandingIOUCollapsed: true,
     existingIOUs: [],
     trustlineLimitField: 0,
     tokenToRemove: '',
     trustlineFlags: 0,
     missingTrustlineInfo: {
          currencyCode: '',
          issuer: '',
     },
};

export const TrustlineStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          // Generic
          setField<K extends keyof TrustlineState>(field: K, value: TrustlineState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof TrustlineState>(field: K, updater: (current: TrustlineState[K]) => TrustlineState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          reset() {
               patchState(store, initialState);
          },

          /** Snapshot */
          getAll(): TrustlineState {
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
               return snapshot as TrustlineState;
          },

          resetOptions() {
               patchState(store, {
                    trustlineAlreadyExist: false,
                    removeTrustlineAvailable: true,
                    removeTrustlineMessage: [],
                    showTrustlineOptions: false,
                    outstandingIOUCollapsed: true,
                    existingIOUs: [],
                    trustlineLimitField: 0,
                    tokenToRemove: '',
                    trustlineFlags: 0,
                    missingTrustlineInfo: {
                         currencyCode: '',
                         issuer: '',
                    },
               });
          },

          currentTrustline(currency: string, issuer: string) {
               return store.existingIOUs().find((tl: any) => tl.currency === currency && tl.issuer === issuer) ?? null;
          },
          setLoading() {
               patchState(store, {
                    isLoading: true,
                    isLoaded: false,
                    error: null,
               });
          },

          setLoaded(data: any[]) {
               patchState(store, {
                    existingIOUs: data,
                    isLoading: false,
                    isLoaded: true,
                    error: null,
               });
          },

          setError(error: string) {
               patchState(store, {
                    existingIOUs: [],
                    isLoading: false,
                    isLoaded: false,
                    error,
               });
          },
     })),

     withComputed(({ existingIOUs }) => ({
          // Any pure computed signals can stay here if you add them later
          trustlineCount: computed(() => existingIOUs().length),
     }))
);
