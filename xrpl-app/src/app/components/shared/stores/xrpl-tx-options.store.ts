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
     isExpirationEnabled: boolean;

     // Tickets
     ticketSequence: string;
     isTicket: boolean;
     ticketArray: string[];
     selectedTickets: string[];
     ticketCountField: string;
     selectedTicketSequences: string[];
     allTicketsForWallet: string[];
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
     isExpirationEnabled: false,
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
     allTicketsForWallet: [],
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

          setIsExpirationEnabled(enabled: boolean) {
               patchState(store, { isExpirationEnabled: enabled });
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

          toggleIsExpirationEnabled(enabled: boolean) {
               patchState(store, { isExpirationEnabled: enabled });
          },

          clearMemos() {
               patchState(store, { memos: [] });
          },

          clearMemoData(index: number) {
               patchState(store, state => {
                    const memos = [...state.memos];
                    if (memos[index]?.Memo) {
                         memos[index].Memo.MemoData = '';
                    } else {
                         memos[index] = {
                              ...memos[index],
                              Memo: {
                                   ...memos[index]?.Memo,
                                   MemoData: '',
                              },
                         };
                    }
                    return { memos };
               });
          },

          clearMemoType(index: number) {
               patchState(store, state => {
                    const memos = [...state.memos];
                    if (memos[index]?.Memo) {
                         memos[index].Memo.MemoType = '';
                    } else {
                         memos[index] = {
                              ...memos[index],
                              Memo: {
                                   ...memos[index]?.Memo,
                                   MemoType: '',
                              },
                         };
                    }
                    return { memos };
               });
          },

          clearMemoFormat(index: number) {
               patchState(store, state => {
                    const memos = [...state.memos];
                    if (memos[index]?.Memo) {
                         memos[index].Memo.MemoFormat = '';
                    } else {
                         memos[index] = {
                              ...memos[index],
                              Memo: {
                                   ...memos[index]?.Memo,
                                   MemoFormat: '',
                              },
                         };
                    }
                    return { memos };
               });
          },

          clearAllMemoFields(index: number) {
               patchState(store, state => {
                    const memos = [...state.memos];
                    memos[index] = {
                         Memo: {
                              MemoData: '',
                              MemoType: '',
                              MemoFormat: '',
                         },
                    };
                    return { memos };
               });
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

          resetOptions() {
               patchState(store, {
                    isMemoEnabled: false,
                    isSimulateEnabled: false,
                    useMultiSign: false,
                    isRegularKeyAddress: false,
                    isTicket: false,
                    memos: [],
               });
          },
     }))
);
