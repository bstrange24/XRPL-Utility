import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface XrplTxOptionsState {
     destinationTag: string | null;
     sourceTag: string | null;
     invoiceId: string;
     ticket: string;
     domainId: string;
     isMemoEnabled: boolean;
     memos: any[];
     lastLedgerSequence: number | null;
     fee: string | null;
}

const initialState: XrplTxOptionsState = {
     destinationTag: null,
     sourceTag: '',
     invoiceId: '',
     domainId: '',
     ticket: '',
     isMemoEnabled: false,
     memos: [],
     lastLedgerSequence: null,
     fee: null,
};

export const XrplTxOptionsStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setDestinationTag(destinationTag: string | null) {
               patchState(store, { destinationTag });
          },

          setInvoiceId(invoiceId: string) {
               patchState(store, { invoiceId });
          },

          setDomainId(domainId: string) {
               patchState(store, { domainId });
          },

          setSourceTag(sourceTag: string) {
               patchState(store, { sourceTag });
          },

          setTicket(ticket: string) {
               patchState(store, { ticket });
          },

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

          clearMemos() {
               patchState(store, { memos: [] });
          },

          reset() {
               patchState(store, initialState);
          },
     }))
);
