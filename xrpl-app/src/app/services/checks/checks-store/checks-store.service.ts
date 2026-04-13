import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface CheckState {
     checkIdField: string;
     destination: string;
     amount: string;
     checkCreator: string;
     checkIdSearchQuery: string;
     outstandingChecks: string;
     mptIssuanceIdField: string;
     checkExpirationDate: string;
     enableExpirationDate: boolean;
     outstandingChecksCollapsed: boolean;
     deliverMinAmount: string;
     useDeliverMin: boolean;
     isCheckOwner: boolean;
     isCollapsed: boolean;
     cancellableChecks: any[];
     cashableChecks: any[];
     existingChecks: any[];
     existingIOUs: any[];
}

const initialState: CheckState = {
     checkIdField: '',
     destination: '',
     amount: '',
     checkCreator: '',
     checkIdSearchQuery: '',
     outstandingChecks: '',
     mptIssuanceIdField: '',
     checkExpirationDate: '',
     enableExpirationDate: false,
     outstandingChecksCollapsed: false,
     deliverMinAmount: '',
     useDeliverMin: false,
     isCheckOwner: false,
     isCollapsed: false,
     cancellableChecks: [],
     cashableChecks: [],
     existingChecks: [],
     existingIOUs: [],
};

export const ChecksStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof CheckState>(field: K, value: CheckState[K]) {
               patchState(store, { [field]: value });
          },

          setCheckExpirationDate(value: string) {
               patchState(store, { checkExpirationDate: value });
          },

          /** Generic updater */
          updateField<K extends keyof CheckState>(field: K, updater: (current: CheckState[K]) => CheckState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Clear expiration */
          clearOptionalExpirationDate() {
               patchState(store, { checkExpirationDate: '' });
          },

          /** Reset dropdown-related fields */
          resetChannelIdSelection() {
               patchState(store, {
                    checkIdField: '',
                    mptIssuanceIdField: '',
                    amount: '',
               });
          },

          /** Reset check form fields */
          resetCheckFields() {
               patchState(store, {
                    checkIdField: '',
                    checkExpirationDate: '',
                    enableExpirationDate: false,
                    destination: '',
                    checkIdSearchQuery: '',
                    outstandingChecks: '',
                    mptIssuanceIdField: '',
                    amount: '',
                    deliverMinAmount: '',
                    useDeliverMin: false,
                    isCheckOwner: false,
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): CheckState {
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
               return snapshot as CheckState;
          },
     }))
);
