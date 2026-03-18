import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface XrplMemo {
     Memo: {
          MemoData?: string;
          MemoType?: string;
          MemoFormat?: string;
     };
}

export interface XrplTxOptionsState {
     // Options
     destinationTag: string | null;
     sourceTag: string | null;
     invoiceId: string;
     isMemoEnabled: boolean;
     memos: any;
     isSimulateEnabled: boolean;
     showEnableTrustline: boolean;

     // Tickets
     ticketSequence: string;
     isTicket: boolean;
     ticketArray: string[];
     selectedTickets: string[];
     ticketCountField: string;
     selectedTicketSequences: string[];
     walletTicketCount: number;
     selectedSingleTicket: string;
     multiSelectMode: boolean;

     // Signing
     useMultiSign: boolean;
     isRegularKeyAddress: boolean;
}

const initialState: XrplTxOptionsState = {
     // Options
     destinationTag: null,
     sourceTag: '',
     invoiceId: '',
     isMemoEnabled: false,
     memos: [],
     isSimulateEnabled: false,
     showEnableTrustline: false,

     // Tickets
     ticketSequence: '',
     isTicket: false,
     selectedSingleTicket: '',
     selectedTickets: [],
     ticketArray: [],
     ticketCountField: '',
     selectedTicketSequences: [],
     walletTicketCount: 0,
     multiSelectMode: false,

     // Signing
     useMultiSign: false,
     isRegularKeyAddress: false,
};

export const XrplTxOptionsStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          // Generic
          setField<K extends keyof XrplTxOptionsState>(field: K, value: XrplTxOptionsState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof XrplTxOptionsState>(field: K, updater: (current: XrplTxOptionsState[K]) => XrplTxOptionsState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          // Memos
          setIsMemoEnabled(enabled: boolean) {
               patchState(store, { isMemoEnabled: enabled });
          },

          addMemo(memo: any) {
               patchState(store, { memos: [...store.memos(), memo] });
          },

          updateMemos(memos: string[]) {
               // Replace the entire memos state
               patchState(store, { memos });
          },

          toggleMemo(enabled: boolean) {
               patchState(store, { isMemoEnabled: enabled });

               if (!enabled) {
                    patchState(store, { memos: [] });
               }
          },

          clearMemos() {
               patchState(store, { memos: [] });
          },

          reset() {
               patchState(store, initialState);
          },

          /** Snapshot */
          getAll(): XrplTxOptionsState {
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
               return snapshot as XrplTxOptionsState;
          },
     }))
);
