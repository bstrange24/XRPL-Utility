import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface TicketState {
     ticketSearchQuery: string;
     isTicketDropdownOpen: boolean;
     highlightedTicketIndex: number;
     ticketCount: number;
     ticketId: string;
     ticketIdIDs: string[];
     existingCredentials: any[];
     selectedCredentials: any;
     subjectCredentials: any[];
}

const initialState: TicketState = {
     ticketSearchQuery: '',
     isTicketDropdownOpen: false,
     highlightedTicketIndex: -1,
     ticketCount: 0,
     ticketId: '',
     ticketIdIDs: [],
     existingCredentials: [],
     selectedCredentials: null,
     subjectCredentials: [],
};

export const TicketStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof TicketState>(field: K, value: TicketState[K]) {
               patchState(store, { [field]: value });
          },

          /** Generic updater */
          updateField<K extends keyof TicketState>(field: K, updater: (current: TicketState[K]) => TicketState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Reset dropdown-related fields */
          resetCredentialIdDropDown() {
               patchState(store, {
                    selectedCredentials: null,
               });
          },

          /** Reset credential form fields */
          resetCredentailFields() {
               patchState(store, {
                    selectedCredentials: null,
                    ticketId: '',
                    ticketIdIDs: [],
                    ticketCount: 0,
                    ticketSearchQuery: '',
               });
          },

          /** Snapshot */
          getAll(): TicketState {
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
               return snapshot as TicketState;
          },
     }))
);
