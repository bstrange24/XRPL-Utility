import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface PermissionedDomainState {
     createdPermissionedDomains: any[];
     setAcceptedCredentials: any[];
     createdDomains: any[];
     selectedDomainId: string;
     credentialType: string;
     credentialIssuer: string;
     subject: string;
     credentialIdSearchQuery: string;
     domainId: string;
     domainMode: string;
}

const initialState: PermissionedDomainState = {
     createdPermissionedDomains: [],
     createdDomains: [],
     setAcceptedCredentials: [],
     selectedDomainId: '',
     credentialType: '',
     credentialIssuer: '',
     subject: '',
     credentialIdSearchQuery: '',
     domainId: '',
     domainMode: 'create',
};

export const PermissionedDomainStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof PermissionedDomainState>(field: K, value: PermissionedDomainState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof PermissionedDomainState>(field: K, updater: (current: PermissionedDomainState[K]) => PermissionedDomainState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          resetDomainDropDown() {
               patchState(store, { selectedDomainId: '' });
          },

          resetDomainFields() {
               patchState(store, {
                    selectedDomainId: '',
                    credentialType: '',
                    setAcceptedCredentials: [],
                    domainId: '',
               });
          },

          /** Snapshot */
          getAll(): PermissionedDomainState {
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
               return snapshot as PermissionedDomainState;
          },
     }))
);
