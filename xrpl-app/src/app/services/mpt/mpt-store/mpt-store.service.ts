import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface MptState {
     mptIssuanceId: string;
     metaData: string;
     authAction: string;
     lockAction: string;
     metadataError: string;
     tokenCount: number;
     assetScale: number;
     isMptFlagModeEnabled: boolean;
     transferFee: number;
     isAuthorized: boolean;
     isUnauthorized: boolean;
     lockedUnlocked: 'locked' | 'unlocked' | '';
     holderAccount: string;
     destination: string;
     amount: string;
     mptIdSearchQuery: string;
     outstandingChecks: string;
     escrowCancelAfterExpirationDate: string;
     escrowFinishAfterExpirationDate: string;
     enableEscrowCancelAfterExpirationDate: boolean;
     enableEscrowFinishAfterExpirationDate: boolean;
     outstandingChecksCollapsed: boolean;
     deliverMinAmount: string;
     isMptEnabled: boolean;
     useDeliverMin: boolean;
     isCheckOwner: boolean;
     isCollapsed: boolean;
     expiredOrFulfilledEscrows: any[];
     allEscrowsRaw: any[];
     finishEscrow: any[];
     existingEscrow: any[];
     existingIOUs: any[];
     existingMpts: any[];
}

const initialState: MptState = {
     mptIssuanceId: '',
     metaData: '',
     authAction: 'authorize',
     lockAction: 'lock',
     metadataError: '',
     tokenCount: 0,
     assetScale: 0,
     isMptFlagModeEnabled: false,
     transferFee: 0,
     isAuthorized: false,
     isUnauthorized: false,
     lockedUnlocked: '',
     holderAccount: '',
     destination: '',
     amount: '',
     mptIdSearchQuery: '',
     outstandingChecks: '',
     escrowCancelAfterExpirationDate: '',
     escrowFinishAfterExpirationDate: '',
     enableEscrowFinishAfterExpirationDate: false,
     enableEscrowCancelAfterExpirationDate: false,
     outstandingChecksCollapsed: false,
     deliverMinAmount: '',
     useDeliverMin: false,
     isCheckOwner: false,
     isCollapsed: false,
     expiredOrFulfilledEscrows: [],
     allEscrowsRaw: [],
     finishEscrow: [],
     existingEscrow: [],
     existingIOUs: [],
     existingMpts: [],
     isMptEnabled: false,
};

export const MptStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(store => ({
          escrowCancelAfterExpirationDate: computed(() => store.escrowCancelAfterExpirationDate()),
          escrowFinishAfterExpirationDate: computed(() => store.escrowFinishAfterExpirationDate()),
     })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof MptState>(field: K, value: MptState[K]) {
               patchState(store, { [field]: value });
          },

          setEscrowFinishAfterExpirationDate(value: string) {
               patchState(store, { escrowFinishAfterExpirationDate: value });
          },

          setEscrowCancelAfterExpirationDate(value: string) {
               patchState(store, { escrowCancelAfterExpirationDate: value });
          },

          /** Generic updater */
          updateField<K extends keyof MptState>(field: K, updater: (current: MptState[K]) => MptState[K]) {
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
                    mptIssuanceId: '',
                    amount: '',
               });
          },

          /** Reset MPT form fields */
          resetMptFields() {
               patchState(store, {
                    escrowFinishAfterExpirationDate: '',
                    escrowCancelAfterExpirationDate: '',
                    enableEscrowFinishAfterExpirationDate: false,
                    enableEscrowCancelAfterExpirationDate: false,
                    destination: '',
                    mptIdSearchQuery: '',
                    outstandingChecks: '',
                    mptIssuanceId: '',
                    amount: '',
                    deliverMinAmount: '',
                    useDeliverMin: false,
                    isCheckOwner: false,
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): MptState {
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
               return snapshot as MptState;
          },
     }))
);
