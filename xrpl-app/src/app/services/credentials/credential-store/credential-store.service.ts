import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

export interface CredentialState {
     credentialIDs: string[];
     credentialID: string;
     credentialType: string;
     subject: string;
     credentialIssuer: string;
     credentialIdSearchQuery: string;
     credentialIdSearchTerm: string;
     existingCredentials: any[];
     selectedCredentials: any;
     subjectCredentials: any[];
     uri: string;
     expirationDate: string;
     credential: any;
     domainId: string;
}

const initialState: CredentialState = {
     credentialIDs: [],
     credentialID: '',
     credentialType: '',
     subject: '',
     credentialIssuer: '',
     credentialIdSearchQuery: '',
     credentialIdSearchTerm: '',
     existingCredentials: [],
     selectedCredentials: null,
     subjectCredentials: [],
     uri: '',
     expirationDate: '',
     credential: null,
     domainId: '',
};

export const CredentialStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(store => ({
          credentialSubjectExpirationDate: computed(() => store.expirationDate()),
     })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof CredentialState>(field: K, value: CredentialState[K]) {
               patchState(store, { [field]: value });
          },

          setCredentialSubjectExpirationDate(value: string) {
               patchState(store, { expirationDate: value });
          },

          /** Generic updater */
          updateField<K extends keyof CredentialState>(field: K, updater: (current: CredentialState[K]) => CredentialState[K]) {
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
               patchState(store, { expirationDate: '' });
          },

          /** Reset dropdown-related fields */
          resetCredentialIdDropDown() {
               patchState(store, {
                    credentialID: '',
                    credentialType: '',
                    credentialIssuer: '',
                    selectedCredentials: null,
               });
          },

          /** Reset credential form fields */
          resetCredentailFields() {
               patchState(store, {
                    credentialID: '',
                    credentialType: '',
                    credentialIssuer: '',
                    selectedCredentials: null,
                    expirationDate: '',
                    credentialIDs: [],
                    subject: '',
                    credentialIdSearchQuery: '',
                    credentialIdSearchTerm: '',
                    uri: '',
               });
          },

          /** Snapshot */
          getAll(): CredentialState {
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
               return snapshot as CredentialState;
          },
     }))
);
