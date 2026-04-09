import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface EscrowState {
     isConditional?: boolean;
     escrowSequenceNumber: string;
     destination: string;
     amount: string;
     escrowOwner: string;
     escrowIdSearchQuery: string;
     outstandingEscrow: string;
     condition: string;
     fulfillment: string;
     escrowCancelAfterExpirationDate: string;
     escrowFinishAfterExpirationDate: string;
     enableEscrowCancelAfterExpirationDate: boolean;
     enableEscrowFinishAfterExpirationDate: boolean;
     outstandingEscrowCollapsed: boolean;
     deliverMinAmount: string;
     useDeliverMin: boolean;
     isEscrowOwner: boolean;
     isCollapsed: boolean;
     expiredOrFulfilledEscrows: any[];
     allEscrowsRaw: any[];
     finishEscrow: any[];
     existingEscrow: any[];
     existingIOUs: any[];
     existingMpts: any[];
}

const initialState: EscrowState = {
     isConditional: false,
     escrowSequenceNumber: '',
     destination: '',
     amount: '',
     escrowOwner: '',
     escrowIdSearchQuery: '',
     outstandingEscrow: '',
     condition: '',
     fulfillment: '',
     escrowCancelAfterExpirationDate: '',
     escrowFinishAfterExpirationDate: '',
     enableEscrowFinishAfterExpirationDate: false,
     enableEscrowCancelAfterExpirationDate: false,
     outstandingEscrowCollapsed: false,
     deliverMinAmount: '',
     useDeliverMin: false,
     isEscrowOwner: false,
     isCollapsed: false,
     expiredOrFulfilledEscrows: [],
     allEscrowsRaw: [],
     finishEscrow: [],
     existingEscrow: [],
     existingIOUs: [],
     existingMpts: [],
};

export const EscrowStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     // withComputed(store => ({
     //      escrowCancelAfterExpirationDate: computed(() => store.escrowCancelAfterExpirationDate()),
     //      escrowFinishAfterExpirationDate: computed(() => store.escrowFinishAfterExpirationDate()),
     // })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof EscrowState>(field: K, value: EscrowState[K]) {
               patchState(store, { [field]: value });
          },

          setEscrowFinishAfterExpirationDate(value: string) {
               patchState(store, { escrowFinishAfterExpirationDate: value });
          },

          setEscrowCancelAfterExpirationDate(value: string) {
               patchState(store, { escrowCancelAfterExpirationDate: value });
          },

          /** Generic updater */
          updateField<K extends keyof EscrowState>(field: K, updater: (current: EscrowState[K]) => EscrowState[K]) {
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
               patchState(store, { escrowCancelAfterExpirationDate: '', escrowFinishAfterExpirationDate: '' });
          },

          /** Reset dropdown-related fields */
          resetChannelIdSelection() {
               patchState(store, {
                    escrowSequenceNumber: '',
                    amount: '',
               });
          },

          /** Reset escrow form fields */
          resetEscrowFields() {
               patchState(store, {
                    escrowSequenceNumber: '',
                    escrowFinishAfterExpirationDate: '',
                    escrowCancelAfterExpirationDate: '',
                    enableEscrowFinishAfterExpirationDate: false,
                    enableEscrowCancelAfterExpirationDate: false,
                    destination: '',
                    escrowOwner: '',
                    condition: '',
                    fulfillment: '',
                    escrowIdSearchQuery: '',
                    outstandingEscrow: '',
                    amount: '',
                    deliverMinAmount: '',
                    useDeliverMin: false,
                    isEscrowOwner: false,
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): EscrowState {
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
               return snapshot as EscrowState;
          },
     }))
);
